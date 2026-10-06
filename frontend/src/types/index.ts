/**
 * ============================================================================
 * 🎓 Domain Types & Interfaces
 * ============================================================================
 */

export interface Pitch {
  id: number;
  author: string;
  title: string;
  description: string;
  category: string;
  voteCount: number;
  totalFundsWei: bigint;
  totalFundsEth: string;
  userHasVoted: boolean;
  createdAt: string;
}

export interface Tip {
  sender: string;
  amount: string;
  message: string;
  timestamp: string;
}

export interface ConnectedWallet {
  account: string;
  chainId: number;
  balance: string;
}

export interface TxReceiptSummary {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
}

export interface TxLogEntry {
  id: number;
  timestamp: string;
  type: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  title?: string;
  category?: string;
  pitchId?: number;
  account?: string;
  amount?: string;
  author?: string;
  recipient?: string;
  network?: string;
  status?: string;
}

export interface PitchEventCallbacks {
  onPitchCreated?: (event: { id: number; author: string; title: string; category: string }) => void;
  onVoted?: (event: { id: number; voter: string; newVoteCount: number }) => void;
  onPitchFunded?: (event: { id: number; funder: string; amountEth: string; message: string }) => void;
}
