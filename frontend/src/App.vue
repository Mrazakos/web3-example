<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Pitch, Tip, TxLogEntry } from './types';
import * as providerService from './services/providerService';
import * as pitchContractService from './services/pitchContractService';

// Child components
import Navbar from './components/Navbar.vue';
import ConceptBanner from './components/ConceptBanner.vue';
import StatsBar from './components/StatsBar.vue';
import PitchCard from './components/PitchCard.vue';
import InspectorTable from './components/InspectorTable.vue';
import NewPitchModal from './components/NewPitchModal.vue';
import TipModal from './components/TipModal.vue';

// --- REACTIVE STATE ---
const account = ref('');
const balance = ref('0.00');
const chainId = ref<number | null>(null);
const isConnecting = ref(false);
const isSubmitting = ref(false);

const pitches = ref<Pitch[]>([]);
const expandedTips = ref<Record<number, boolean>>({});
const pitchTipsMap = ref<Record<number, Tip[]>>({});
const activeTipPitch = ref<Pitch | null>(null);
const showNewPitchModal = ref(false);

const errorMessage = ref('');
const successMessage = ref('');
const txLogs = ref<TxLogEntry[]>([]);

// --- COMPUTED ---
const isCorrectNetwork = computed(() => Number(chainId.value) === providerService.HARDHAT_CHAIN_ID);
const totalVotes = computed(() => pitches.value.reduce((sum, p) => sum + p.voteCount, 0));
const totalEthFunded = computed(() => {
  const sumEth = pitches.value.reduce((sum, p) => sum + Number(p.totalFundsEth || 0), 0);
  return sumEth.toFixed(2);
});

// --- LOGGING & FEEDBACK HELPERS ---
function addLog(type: string, details: Partial<TxLogEntry>) {
  txLogs.value.unshift({
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    ...details
  });
}

function showNotice(msg: string) {
  successMessage.value = msg;
  setTimeout(() => { if (successMessage.value === msg) successMessage.value = ''; }, 4500);
}

function showError(msg: string) {
  errorMessage.value = msg;
  setTimeout(() => { if (errorMessage.value === msg) errorMessage.value = ''; }, 6000);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showNotice('Copied address to clipboard!');
  } catch (err) {
    console.error(err);
  }
}

// --- DATA FETCHING ---
async function loadPitches() {
  try {
    pitches.value = await pitchContractService.fetchAllPitches(account.value);
  } catch (err) {
    console.error('Error fetching pitches:', err);
  }
}

async function handleToggleTips(pitchId: number) {
  expandedTips.value[pitchId] = !expandedTips.value[pitchId];
  if (expandedTips.value[pitchId] && !pitchTipsMap.value[pitchId]) {
    try {
      pitchTipsMap.value[pitchId] = await pitchContractService.fetchPitchTips(pitchId);
    } catch (e) {
      console.error(e);
    }
  }
}

// --- USER ACTIONS (SERVICES CALLS) ---

async function handleConnect() {
  isConnecting.value = true;
  errorMessage.value = '';
  try {
    const data = await providerService.connectWallet();
    account.value = data.account;
    chainId.value = data.chainId;
    balance.value = data.balance;

    addLog('Wallet Connected', { account: data.account, network: `Chain ID ${data.chainId}` });
    await loadPitches();
  } catch (err: any) {
    showError(err.message || 'Failed to connect MetaMask');
  } finally {
    isConnecting.value = false;
  }
}

async function handleSwitchNetwork() {
  try {
    await providerService.switchOrAddHardhatNetwork();
  } catch (err: any) {
    showError('Could not switch network: ' + (err.message || err));
  }
}

async function handleCreatePitch(payload: { title: string; description: string; category: string }) {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    addLog('Tx Prompted: Pitch', { title: payload.title, category: payload.category });
    const receipt = await pitchContractService.createPitch(payload.title, payload.description, payload.category);
    addLog('Block Mined: Pitch Created', receipt);

    showNotice(`🎉 Pitch "${payload.title}" recorded on blockchain!`);
    showNewPitchModal.value = false;
    await loadPitches();
    balance.value = await providerService.fetchBalance(account.value);
  } catch (err: any) {
    showError(err.reason || err.message || 'Transaction rejected');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleVote(pitchId: number) {
  if (!account.value) {
    await handleConnect();
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    addLog('Tx Prompted: Vote', { pitchId });
    const receipt = await pitchContractService.vote(pitchId);
    addLog('Block Mined: Vote Confirmed', { ...receipt, pitchId });

    showNotice(`🗳️ Vote recorded for Pitch #${pitchId}!`);
    await loadPitches();
    balance.value = await providerService.fetchBalance(account.value);
  } catch (err: any) {
    if (err.message && err.message.includes('AlreadyVoted')) {
      showError('You already voted for this project! Smart contract prevents duplicate voting.');
    } else {
      showError(err.reason || err.message || 'Voting failed');
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleSendTip(payload: { pitchId: number; amountEth: string; message: string }) {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    addLog('Tx Prompted: Micro-Grant', { pitchId: payload.pitchId, amount: `${payload.amountEth} ETH` });
    const receipt = await pitchContractService.tipPitch(payload.pitchId, payload.amountEth, payload.message);
    addLog('Block Mined: Micro-Grant Sent', { ...receipt, amount: `${payload.amountEth} ETH` });

    showNotice(`💸 ${payload.amountEth} ETH sent directly to the student author!`);
    const id = payload.pitchId;
    activeTipPitch.value = null;

    await loadPitches();
    if (expandedTips.value[id]) {
      pitchTipsMap.value[id] = await pitchContractService.fetchPitchTips(id);
    }
    balance.value = await providerService.fetchBalance(account.value);
  } catch (err: any) {
    showError(err.reason || err.message || 'Grant transfer failed');
  } finally {
    isSubmitting.value = false;
  }
}

// --- LIFECYCLE ---
onMounted(async () => {
  await loadPitches();

  // Subscribe to real-time events
  pitchContractService.subscribeToPitchEvents({
    onPitchCreated: (ev) => {
      addLog('EVENT: PitchCreated', { id: ev.id, title: ev.title, category: ev.category, author: ev.author });
      loadPitches();
    },
    onVoted: (ev) => {
      addLog('EVENT: Voted', { id: ev.id, account: ev.voter, pitchId: ev.id });
      loadPitches();
    },
    onPitchFunded: (ev) => {
      addLog('EVENT: PitchFunded', { id: ev.id, amount: ev.amountEth, recipient: ev.funder });
      loadPitches();
    }
  });

  // Watch MetaMask account & chain changes
  if (providerService.isMetaMaskInstalled()) {
    try {
      const provider = providerService.getBrowserProvider();
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        account.value = accounts[0].address;
        const net = await provider.getNetwork();
        chainId.value = Number(net.chainId);
        balance.value = await providerService.fetchBalance(account.value);
        await loadPitches();
      }

      providerService.onAccountsChanged(async (accs) => {
        account.value = accs[0] || '';
        balance.value = await providerService.fetchBalance(account.value);
        await loadPitches();
      });

      providerService.onChainChanged(() => {
        window.location.reload();
      });
    } catch (e) {
      console.warn('Init check note:', e);
    }
  }
});
</script>

<template>
  <div class="app-layout">
    <!-- NAVBAR -->
    <Navbar
      :account="account"
      :balance="balance"
      :chain-id="chainId"
      :is-connecting="isConnecting"
      :is-correct-network="isCorrectNetwork"
      @connect="handleConnect"
      @switch-network="handleSwitchNetwork"
      @copy="copyToClipboard"
    />

    <!-- ALERTS -->
    <div v-if="errorMessage" class="alert alert-error">
      <span>⚠️ {{ errorMessage }}</span>
      <button class="alert-close" @click="errorMessage = ''">&times;</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">&times;</button>
    </div>

    <!-- MAIN BODY -->
    <main class="main-container">
      <ConceptBanner />

      <StatsBar
        :total-projects="pitches.length"
        :total-votes="totalVotes"
        :total-eth-funded="totalEthFunded"
        @open-new-pitch="showNewPitchModal = true"
      />

      <!-- PITCHES GRID -->
      <section class="pitches-section">
        <div class="section-title-row">
          <h2>Campus Project Proposals</h2>
          <span class="live-indicator">● Synchronized with Blockchain</span>
        </div>

        <div v-if="pitches.length === 0" class="empty-state">
          <p>No project proposals on the ledger yet.</p>
        </div>

        <div class="pitches-grid">
          <PitchCard
            v-for="pitch in pitches"
            :key="pitch.id"
            :pitch="pitch"
            :is-submitting="isSubmitting"
            :expanded="Boolean(expandedTips[pitch.id])"
            :tips="pitchTipsMap[pitch.id]"
            @vote="handleVote"
            @open-tip="activeTipPitch = $event"
            @toggle-tips="handleToggleTips"
            @copy="copyToClipboard"
          />
        </div>
      </section>

      <!-- INSPECTOR TABLE -->
      <InspectorTable
        :logs="txLogs"
        @clear="txLogs = []"
        @copy="copyToClipboard"
      />
    </main>

    <!-- MODALS -->
    <NewPitchModal
      :show="showNewPitchModal"
      :is-submitting="isSubmitting"
      @close="showNewPitchModal = false"
      @submit="handleCreatePitch"
    />

    <TipModal
      :pitch="activeTipPitch"
      :is-submitting="isSubmitting"
      @close="activeTipPitch = null"
      @send-tip="handleSendTip"
    />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.alert {
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
}

.alert-error {
  background-color: var(--danger-light);
  color: var(--danger-color);
  border-bottom: 1px solid #fecaca;
}

.alert-success {
  background-color: var(--success-light);
  color: var(--success-color);
  border-bottom: 1px solid #a7f3d0;
}

.alert-close {
  background: none;
  font-size: 1.3rem;
  color: inherit;
}

.main-container {
  max-width: 1200px;
  width: 100%;
  margin: 24px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title-row h2 {
  font-size: 1.35rem;
  font-weight: 800;
}

.live-indicator {
  font-size: 0.8rem;
  color: var(--success-color);
  font-weight: 600;
}

.pitches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.empty-state {
  background-color: #ffffff;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
</style>
