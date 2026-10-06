/**
 * ============================================================================
 * 📜 Pitch Contract Service: Smart Contract Interface (TypeScript)
 * ============================================================================
 * Manages queries, transactions, and event subscriptions for CampusPitches.sol.
 * Demonstrates Ethers.js read calls (free) vs write calls (signed). (Under 160 lines)
 */

import { ethers } from 'ethers';
import contractAddressData from '../contracts/contract-address.json';
import contractArtifact from '../contracts/CampusPitches.json';
import { getBrowserProvider, getSigner } from './providerService';
import type { Pitch, Tip, TxReceiptSummary, PitchEventCallbacks } from '../types';

/**
 * Returns an instance of the CampusPitches smart contract.
 * @param withSigner True for state mutations (costs gas), false for view queries (free).
 */
export async function getPitchContract(withSigner: boolean = false): Promise<ethers.Contract> {
  const runner = withSigner ? await getSigner() : getBrowserProvider();
  return new ethers.Contract(contractAddressData.CampusPitches, contractArtifact.abi, runner);
}

/**
 * READ CALL: Fetches all project proposals from EVM storage.
 */
export async function fetchAllPitches(currentAccount?: string): Promise<Pitch[]> {
  const contract = await getPitchContract(false);
  const rawPitches = await contract.getAllPitches();

  return Promise.all(
    rawPitches.map(async (p: any): Promise<Pitch> => {
      const id = Number(p.id);
      let userHasVoted = false;

      if (currentAccount) {
        try {
          userHasVoted = await contract.checkIfVoted(id, currentAccount);
        } catch (e) {
          console.warn(`Could not check vote status for pitch #${id}`, e);
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
}

/**
 * READ CALL: Fetches tips and supporter notes for a specific pitch.
 */
export async function fetchPitchTips(pitchId: number): Promise<Tip[]> {
  const contract = await getPitchContract(false);
  const rawTips = await contract.getPitchTips(pitchId);

  return rawTips.map((t: any): Tip => ({
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
 * WRITE CALL: Proposes a new project idea on-chain.
 */
export async function createPitch(title: string, description: string, category: string): Promise<TxReceiptSummary> {
  const contract = await getPitchContract(true);
  const tx = await contract.createPitch(title, description, category);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * WRITE CALL: Casts an upvote (enforcing 1 vote per wallet on-chain).
 */
export async function vote(pitchId: number): Promise<TxReceiptSummary> {
  const contract = await getPitchContract(true);
  const tx = await contract.vote(pitchId);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * WRITE CALL: Sends a direct peer-to-peer ETH micro-grant to the author.
 */
export async function tipPitch(pitchId: number, amountEth: string, message: string): Promise<TxReceiptSummary> {
  const contract = await getPitchContract(true);
  const weiValue = ethers.parseEther(amountEth.toString());

  const tx = await contract.tipPitch(pitchId, message || 'Community Grant', { value: weiValue });
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  };
}

/**
 * EVENT LISTENER: Subscribes to real-time blockchain logs.
 */
export async function subscribeToPitchEvents(callbacks: PitchEventCallbacks): Promise<void> {
  try {
    const contract = await getPitchContract(false);

    if (callbacks.onPitchCreated) {
      contract.on('PitchCreated', (id, author, title, category) => {
        callbacks.onPitchCreated!({ id: Number(id), author, title, category });
      });
    }

    if (callbacks.onVoted) {
      contract.on('Voted', (id, voter, newVoteCount) => {
        callbacks.onVoted!({ id: Number(id), voter, newVoteCount: Number(newVoteCount) });
      });
    }

    if (callbacks.onPitchFunded) {
      contract.on('PitchFunded', (id, funder, amountWei, message) => {
        callbacks.onPitchFunded!({ id: Number(id), funder, amountEth: ethers.formatEther(amountWei), message });
      });
    }
  } catch (err) {
    console.warn('Event subscription note:', err);
  }
}
