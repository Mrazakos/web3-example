/**
 * ============================================================================
 * 🎓 Web3 Service: Educational Blockchain Interface
 * ============================================================================
 * 
 * This module isolates all Web3 / Ethereum interactions from the Vue UI.
 * It demonstrates the 3 foundational pillars of interacting with smart contracts:
 * 
 * 1. PROVIDER (Read-only): Connects to the blockchain node to fetch state (free).
 * 2. SIGNER (Write/Mutate): Manages private keys via MetaMask to sign transactions.
 * 3. CONTRACT INSTANCE: Links contract ABI + address to JavaScript methods.
 */

import { ethers } from 'ethers';
import contractAddressData from '../contracts/contract-address.json';
import contractArtifact from '../contracts/CampusPitches.json';

// Localhost Chain IDs
export const HARDHAT_CHAIN_ID = 31337;
export const HARDHAT_CHAIN_ID_HEX = '0x7a69';

/**
 * Check if MetaMask is installed in the user's browser.
 */
export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/**
 * 1. GET PROVIDER (Ethers BrowserProvider)
 * ----------------------------------------
 * Wraps the standard EIP-1193 window.ethereum object injected by MetaMask.
 * Used for read-only RPC calls (querying state, reading balances, etc.).
 */
export function getProvider() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install the MetaMask browser extension.');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

/**
 * 2. GET SMART CONTRACT INSTANCE
 * ------------------------------
 * Combines:
 *  - Contract Address: 0x5FbDB... (where the contract lives in EVM storage)
 *  - ABI (Interface): List of functions, inputs, outputs, and events
 *  - Signer or Provider: If signer is provided, functions can write state; if provider, read-only.
 * 
 * @param {boolean} withSigner - True if invoking a state-mutating function (vote, tip, pitch)
 */
export async function getContract(withSigner = false) {
  const provider = getProvider();
  if (withSigner) {
    // getSigner() triggers MetaMask to use the currently active account
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddressData.CampusPitches, contractArtifact.abi, signer);
  }
  return new ethers.Contract(contractAddressData.CampusPitches, contractArtifact.abi, provider);
}

/**
 * 3. CONNECT WALLET
 * -----------------
 * Prompts the user to authorize their MetaMask account.
 * Note: Web3 dApps never ask for passwords! We only request the user's public address.
 */
export async function connectWallet() {
  const provider = getProvider();
  
  // eth_requestAccounts triggers the MetaMask connect popup
  const accounts = await provider.send('eth_requestAccounts', []);
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found or connection rejected');
  }

  const network = await provider.getNetwork();
  const rawBalance = await provider.getBalance(accounts[0]);

  return {
    account: accounts[0],
    chainId: Number(network.chainId),
    balance: Number(ethers.formatEther(rawBalance)).toFixed(4)
  };
}

/**
 * 4. FETCH CURRENT ACCOUNT BALANCE
 */
export async function fetchBalance(address) {
  if (!address) return '0.00';
  const provider = getProvider();
  const rawBalance = await provider.getBalance(address);
  return Number(ethers.formatEther(rawBalance)).toFixed(4);
}

/**
 * 5. FETCH ALL PITCHES (READ CALL)
 * --------------------------------
 * Calls getAllPitches() on the smart contract.
 * Because this is a `view` function, it does NOT cost gas or require MetaMask confirmation!
 */
export async function fetchAllPitches(currentAccount = null) {
  const contract = await getContract(false);
  const rawPitches = await contract.getAllPitches();

  // Map raw blockchain structs to friendly JavaScript objects
  const pitches = await Promise.all(
    rawPitches.map(async (p) => {
      const id = Number(p.id);
      let userHasVoted = false;

      // If user is connected, check whether they have already voted for this pitch
      if (currentAccount) {
        try {
          userHasVoted = await contract.checkIfVoted(id, currentAccount);
        } catch (e) {
          console.warn(`Could not check vote status for pitch #${id}:`, e);
        }
      }

      return {
        id,
        author: p.author,
        title: p.title,
        description: p.description,
        category: p.category,
        voteCount: Number(p.voteCount),
        totalFundsWei: p.totalFunds,
        totalFundsEth: Number(ethers.formatEther(p.totalFunds)).toFixed(3),
        userHasVoted,
        createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    })
  );

  return pitches;
}

/**
 * 6. FETCH SUPPORTER TIPS & NOTES FOR A PITCH
 */
export async function fetchPitchTips(pitchId) {
  const contract = await getContract(false);
  const rawTips = await contract.getPitchTips(pitchId);

  return rawTips.map((t) => ({
    sender: t.sender,
    amount: ethers.formatEther(t.amount),
    message: t.message,
    timestamp: new Date(Number(t.timestamp) * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }));
}

/**
 * ============================================================================
 * STATE-MUTATING TRANSACTIONS (WRITE CALLS - REQUIRE SIGNING & GAS)
 * ============================================================================
 */

/**
 * 7. SUBMIT A NEW PITCH (Write Call)
 * ----------------------------------
 * Step A: Calls contract.createPitch(...) with signer.
 * Step B: MetaMask prompts user to sign the transaction.
 * Step C: tx.wait() pauses until the local EVM mines the transaction into a block.
 * Step D: Returns the receipt containing block number and gas used.
 */
export async function createPitchOnChain(title, description, category) {
  const contract = await getContract(true);

  // Send transaction to the EVM mempool
  const tx = await contract.createPitch(title, description, category);

  // Wait for the transaction to be mined into a block
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * 8. CAST AN UPVOTE (Write Call)
 * ------------------------------
 * Enforces 1 vote per wallet address. If the wallet already voted,
 * the EVM reverts with custom error `AlreadyVoted`.
 */
export async function voteOnChain(pitchId) {
  const contract = await getContract(true);

  const tx = await contract.vote(pitchId);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * 9. SEND ETH MICRO-GRANT / TIP (Write Call with Native Value Transfer)
 * ---------------------------------------------------------------------
 * Demonstrates Solidity `msg.value`!
 * We pass `{ value: ethers.parseEther(amountInEth) }` as transaction overrides.
 * This instructs MetaMask to attach actual native ETH to the contract call.
 */
export async function tipPitchOnChain(pitchId, amountInEth, message) {
  const contract = await getContract(true);

  // Convert human-readable ETH string (e.g., "0.1") into Wei (10^18)
  const weiValue = ethers.parseEther(amountInEth.toString());

  // Call the payable function with native value attached
  const tx = await contract.tipPitch(pitchId, message || 'Community Grant', {
    value: weiValue
  });

  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * 10. NETWORK SWITCHER (EIP-3085 & EIP-3326)
 * ------------------------------------------
 * Helps students effortlessly switch MetaMask to Hardhat Localhost.
 */
export async function switchOrAddHardhatNetwork() {
  if (!isMetaMaskInstalled()) return;

  try {
    // Attempt switching first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (error) {
    // Error code 4902 indicates that the chain has not yet been added to MetaMask
    if (error.code === 4902 || error.message?.includes('4902')) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: HARDHAT_CHAIN_ID_HEX,
            chainName: 'Hardhat Localhost',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/**
 * 11. SUBSCRIBE TO LIVE BLOCKCHAIN EVENTS
 * ---------------------------------------
 * Demonstrates real-time reactive event logs emitted by the smart contract.
 */
export async function subscribeToContractEvents({ onPitchCreated, onVoted, onPitchFunded }) {
  try {
    const contract = await getContract(false);

    if (onPitchCreated) {
      contract.on('PitchCreated', (id, author, title, category) => {
        onPitchCreated({
          id: Number(id),
          author,
          title,
          category
        });
      });
    }

    if (onVoted) {
      contract.on('Voted', (id, voter, newVoteCount) => {
        onVoted({
          id: Number(id),
          voter,
          newVoteCount: Number(newVoteCount)
        });
      });
    }

    if (onPitchFunded) {
      contract.on('PitchFunded', (id, funder, amountWei, message) => {
        onPitchFunded({
          id: Number(id),
          funder,
          amountEth: ethers.formatEther(amountWei),
          message
        });
      });
    }
  } catch (err) {
    console.warn('Event subscription note:', err);
  }
}
