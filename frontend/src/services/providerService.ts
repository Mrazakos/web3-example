/**
 * ============================================================================
 * 🦊 Provider Service: MetaMask & Wallet Management (TypeScript)
 * ============================================================================
 * Handles provider initialization, account connection, balance queries,
 * and EIP-3085/3326 network switching. (Under 100 lines)
 */

import { ethers } from 'ethers';
import type { ConnectedWallet } from '../types';

export const HARDHAT_CHAIN_ID = 31337;
export const HARDHAT_CHAIN_ID_HEX = '0x7a69';

export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export function getBrowserProvider(): ethers.BrowserProvider {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install the browser extension.');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const provider = getBrowserProvider();
  return provider.getSigner();
}

/**
 * Prompts user to connect MetaMask and returns account, chain ID, and ETH balance.
 */
export async function connectWallet(): Promise<ConnectedWallet> {
  const provider = getBrowserProvider();
  const accounts: string[] = await provider.send('eth_requestAccounts', []);

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected or connection was rejected.');
  }

  const network = await provider.getNetwork();
  const balance = await fetchBalance(accounts[0]);

  return {
    account: accounts[0],
    chainId: Number(network.chainId),
    balance
  };
}

/**
 * Reads the native ETH balance for a given address.
 */
export async function fetchBalance(address: string): Promise<string> {
  if (!address) return '0.00';
  const provider = getBrowserProvider();
  const rawBalance = await provider.getBalance(address);
  return Number(ethers.formatEther(rawBalance)).toFixed(4);
}

/**
 * Switches MetaMask to the Hardhat Localhost network (Chain ID 31337).
 */
export async function switchOrAddHardhatNetwork(): Promise<void> {
  if (!isMetaMaskInstalled()) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error.code === 4902 || error.message?.includes('4902')) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: HARDHAT_CHAIN_ID_HEX,
            chainName: 'Hardhat Localhost',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Listeners for wallet account and chain switches in MetaMask.
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('accountsChanged', callback);
  }
}

export function onChainChanged(callback: () => void): void {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('chainChanged', callback);
  }
}
