<script setup>
import { ref, onMounted, computed } from 'vue';
import * as web3Service from './services/web3Service';

// ==========================================
// 1. COMPONENT STATE
// ==========================================
const account = ref('');
const balance = ref('0.00');
const chainId = ref(null);
const isConnecting = ref(false);
const isSubmitting = ref(false);

// Pitches & Community data
const pitches = ref([]);
const expandedTips = ref({});
const pitchTipsMap = ref({});

// User Notifications & Explanations
const errorMessage = ref('');
const successMessage = ref('');
const showConcepts = ref(true);

// Modals
const showNewPitchModal = ref(false);
const activeTipPitch = ref(null);
const tipAmount = ref('0.1');
const tipMessage = ref('');

// Form inputs
const newTitle = ref('');
const newDescription = ref('');
const newCategory = ref('Artificial Intelligence');

const categories = [
  'Artificial Intelligence',
  'Sustainability',
  'Robotics & Hardware',
  'Campus Life & Tools',
  'Social Impact'
];

// Live Blockchain Transaction & Event Inspector Log
const txLogs = ref([]);

// ==========================================
// 2. COMPUTED VALUES & HELPERS
// ==========================================
const isCorrectNetwork = computed(() => Number(chainId.value) === web3Service.HARDHAT_CHAIN_ID);
const totalVotes = computed(() => pitches.value.reduce((sum, p) => sum + p.voteCount, 0));
const totalEthFunded = computed(() => {
  const sumEth = pitches.value.reduce((sum, p) => sum + Number(p.totalFundsEth || 0), 0);
  return sumEth.toFixed(2);
});

function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

function addTxLog(type, details) {
  txLogs.value.unshift({
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    ...details
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotice('Copied address to clipboard!');
  } catch (err) {
    console.error(err);
  }
}

function showNotice(msg) {
  successMessage.value = msg;
  setTimeout(() => { if (successMessage.value === msg) successMessage.value = ''; }, 4500);
}

function showError(msg) {
  errorMessage.value = msg;
  setTimeout(() => { if (errorMessage.value === msg) errorMessage.value = ''; }, 6000);
}

// ==========================================
// 3. ACTIONS CALLED FROM TEMPLATE
// ==========================================

/**
 * CONNECT WALLET: Calls web3Service.connectWallet()
 */
async function handleConnect() {
  isConnecting.value = true;
  errorMessage.value = '';
  try {
    const data = await web3Service.connectWallet();
    account.value = data.account;
    chainId.value = data.chainId;
    balance.value = data.balance;

    addTxLog('Wallet Connected', {
      account: shortenAddress(account.value),
      network: `Chain ID ${chainId.value}`
    });

    await loadPitches();
  } catch (err) {
    showError(err.message || 'Failed to connect MetaMask');
  } finally {
    isConnecting.value = false;
  }
}

/**
 * SWITCH NETWORK: Calls web3Service.switchOrAddHardhatNetwork()
 */
async function handleSwitchNetwork() {
  try {
    await web3Service.switchOrAddHardhatNetwork();
  } catch (err) {
    showError('Could not switch network: ' + (err.message || err));
  }
}

/**
 * LOAD DATA: Calls web3Service.fetchAllPitches()
 */
async function loadPitches() {
  try {
    pitches.value = await web3Service.fetchAllPitches(account.value);
  } catch (err) {
    console.error('Error fetching pitches:', err);
  }
}

/**
 * LOAD TIPS: Calls web3Service.fetchPitchTips(pitchId)
 */
async function toggleTips(pitchId) {
  expandedTips.value[pitchId] = !expandedTips.value[pitchId];
  if (expandedTips.value[pitchId] && !pitchTipsMap.value[pitchId]) {
    try {
      pitchTipsMap.value[pitchId] = await web3Service.fetchPitchTips(pitchId);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * SUBMIT PITCH: Calls web3Service.createPitchOnChain(...)
 */
async function handleSubmitPitch() {
  if (!newTitle.value.trim()) {
    showError('Please enter a project title');
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    addTxLog('Tx Prompted: Pitch', { title: newTitle.value, category: newCategory.value });

    // Send to blockchain via service
    const result = await web3Service.createPitchOnChain(
      newTitle.value,
      newDescription.value,
      newCategory.value
    );

    addTxLog('Block Mined: Pitch Created', {
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    });

    showNotice(`🎉 Pitch "${newTitle.value}" permanently recorded on the blockchain!`);
    newTitle.value = '';
    newDescription.value = '';
    showNewPitchModal.value = false;

    // Refresh pitches & wallet balance
    await loadPitches();
    balance.value = await web3Service.fetchBalance(account.value);
  } catch (err) {
    console.error(err);
    showError(err.reason || err.message || 'Transaction rejected');
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * VOTE: Calls web3Service.voteOnChain(pitchId)
 */
async function handleVote(pitchId) {
  if (!account.value) {
    await handleConnect();
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    addTxLog('Tx Prompted: Upvote', { pitchId });

    // Send vote transaction to smart contract
    const result = await web3Service.voteOnChain(pitchId);

    addTxLog('Block Mined: Vote Confirmed', {
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      pitchId
    });

    showNotice(`🗳️ Vote cast for Pitch #${pitchId}!`);
    await loadPitches();
    balance.value = await web3Service.fetchBalance(account.value);
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('AlreadyVoted')) {
      showError('You already voted for this project! Smart contract prevents duplicate voting.');
    } else {
      showError(err.reason || err.message || 'Vote transaction failed');
    }
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * TIP ETH: Calls web3Service.tipPitchOnChain(pitchId, amount, message)
 */
function openTipModal(pitch) {
  activeTipPitch.value = pitch;
  tipAmount.value = '0.1';
  tipMessage.value = 'Great initiative! Sponsoring from student fund 🚀';
}

async function handleSendTip() {
  if (!activeTipPitch.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const pitch = activeTipPitch.value;
    addTxLog('Tx Prompted: Micro-Grant', {
      pitchId: pitch.id,
      amount: `${tipAmount.value} ETH`,
      recipient: shortenAddress(pitch.author)
    });

    // Execute native ETH transfer via service
    const result = await web3Service.tipPitchOnChain(pitch.id, tipAmount.value, tipMessage.value);

    addTxLog('Block Mined: Micro-Grant Sent', {
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      amount: `${tipAmount.value} ETH`,
      recipient: shortenAddress(pitch.author)
    });

    showNotice(`💸 ${tipAmount.value} ETH sent directly to ${shortenAddress(pitch.author)}!`);
    const targetId = pitch.id;
    activeTipPitch.value = null;

    // Refresh state
    await loadPitches();
    if (expandedTips.value[targetId]) {
      pitchTipsMap.value[targetId] = await web3Service.fetchPitchTips(targetId);
    }
    balance.value = await web3Service.fetchBalance(account.value);
  } catch (err) {
    console.error(err);
    showError(err.reason || err.message || 'Grant transfer failed');
  } finally {
    isSubmitting.value = false;
  }
}

// ==========================================
// 4. LIFECYCLE & EVENT LISTENERS
// ==========================================
onMounted(async () => {
  // 1. Initial pitch data load
  await loadPitches();

  // 2. Setup real-time event subscriptions
  web3Service.subscribeToContractEvents({
    onPitchCreated: (ev) => {
      addTxLog('EVENT: PitchCreated', {
        id: ev.id,
        title: ev.title,
        category: ev.category,
        author: shortenAddress(ev.author)
      });
      loadPitches();
    },
    onVoted: (ev) => {
      addTxLog('EVENT: Voted', {
        id: ev.id,
        voter: shortenAddress(ev.voter),
        newVoteCount: ev.newVoteCount
      });
      loadPitches();
    },
    onPitchFunded: (ev) => {
      addTxLog('EVENT: PitchFunded', {
        id: ev.id,
        funder: shortenAddress(ev.funder),
        amount: `${ev.amountEth} ETH`,
        message: ev.message
      });
      loadPitches();
    }
  });

  // 3. React to MetaMask account and network changes
  if (web3Service.isMetaMaskInstalled()) {
    try {
      const provider = web3Service.getProvider();
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        account.value = accounts[0].address;
        const net = await provider.getNetwork();
        chainId.value = Number(net.chainId);
        balance.value = await web3Service.fetchBalance(account.value);
        await loadPitches();
      }

      window.ethereum.on('accountsChanged', async (accs) => {
        if (!accs || accs.length === 0) {
          account.value = '';
          balance.value = '0.00';
        } else {
          account.value = accs[0];
          balance.value = await web3Service.fetchBalance(account.value);
          await loadPitches();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    } catch (e) {
      console.warn('Auto-connect check note:', e);
    }
  }
});
</script>

<template>
  <div class="app-layout">
    <!-- TOP NAVIGATION BAR -->
    <header class="navbar">
      <div class="nav-left">
        <div class="brand-badge">🎓 Web3 Lecture Demo</div>
        <h1 class="logo-title">Campus IdeaHub</h1>
        <span class="subtitle">Decentralized Student Pitch & Micro-Grants</span>
      </div>

      <div class="nav-right">
        <!-- Network Status Pill -->
        <div v-if="account" class="network-badge" :class="isCorrectNetwork ? 'network-ok' : 'network-warn'">
          <span class="dot"></span>
          <span v-if="isCorrectNetwork">Hardhat Localhost (31337)</span>
          <span v-else>Chain ID {{ chainId || 'Unknown' }}</span>
        </div>

        <!-- 1-Click Switch Button -->
        <button v-if="account && !isCorrectNetwork" @click="handleSwitchNetwork" class="btn-switch-network">
          ⚡ Switch to Hardhat
        </button>

        <!-- Connected Wallet Pill -->
        <div v-if="account" class="account-pill">
          <span class="account-balance">{{ balance }} ETH</span>
          <div class="account-address" @click="copyToClipboard(account)" title="Click to copy address">
            <span>{{ shortenAddress(account) }}</span>
            <span class="copy-icon">📋</span>
          </div>
        </div>

        <!-- Connect MetaMask Button -->
        <button v-else @click="handleConnect" :disabled="isConnecting" class="btn-connect">
          <span v-if="isConnecting">Connecting...</span>
          <span v-else>🦊 Connect MetaMask</span>
        </button>
      </div>
    </header>

    <!-- ALERT NOTIFICATIONS -->
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
      
      <!-- EDUCATIONAL CONCEPT BANNER -->
      <section class="concept-card">
        <div class="concept-header" @click="showConcepts = !showConcepts">
          <div class="concept-title">
            <span class="badge-accent">Presenter Guide</span>
            <h3>How this Web3 dApp Works "Under the Hood"</h3>
          </div>
          <button class="btn-text-toggle">{{ showConcepts ? 'Hide Details ▲' : 'Show Details ▼' }}</button>
        </div>

        <div v-if="showConcepts" class="concept-grid">
          <div class="concept-step">
            <div class="step-num">1</div>
            <h4>Cryptographic Identity</h4>
            <p>No passwords. MetaMask signs transaction hashes using the student's asymmetric private key.</p>
          </div>
          <div class="concept-step">
            <div class="step-num">2</div>
            <h4>Immutable Smart Contract</h4>
            <p><strong>CampusPitches.sol</strong> runs on the local EVM. 1-vote-per-wallet rule is mathematically enforced.</p>
          </div>
          <div class="concept-step">
            <div class="step-num">3</div>
            <h4>Direct P2P Micro-Grants</h4>
            <p>Tips in ETH flow directly to the pitch creator via <code>msg.value</code> without bank processing delays or fees.</p>
          </div>
          <div class="concept-step">
            <div class="step-num">4</div>
            <h4>Modular Web3 Service</h4>
            <p>UI calls <code>web3Service.js</code>, separating business/state presentation from low-level JSON-RPC calls.</p>
          </div>
        </div>
      </section>

      <!-- STATS & ACTION BAR -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">Total Projects</span>
          <span class="stat-value">{{ pitches.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Community Votes</span>
          <span class="stat-value">{{ totalVotes }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Micro-Grants Funded</span>
          <span class="stat-value highlight-eth">{{ totalEthFunded }} ETH</span>
        </div>
        <div class="stat-action">
          <button @click="showNewPitchModal = true" class="btn-primary">
            + Pitch a New Idea
          </button>
        </div>
      </div>

      <!-- PITCHES GRID -->
      <section class="pitches-section">
        <div class="section-title-row">
          <h2>Campus Project Proposals</h2>
          <span class="live-indicator">● Synchronized with Blockchain</span>
        </div>

        <div v-if="pitches.length === 0" class="empty-state">
          <p>No project proposals on the ledger yet.</p>
          <button @click="showNewPitchModal = true" class="btn-secondary">Submit the first idea</button>
        </div>

        <div class="pitches-grid">
          <div v-for="pitch in pitches" :key="pitch.id" class="pitch-card">
            
            <div class="pitch-card-top">
              <span class="pitch-category">{{ pitch.category }}</span>
              <span class="pitch-id">#{{ pitch.id }}</span>
            </div>

            <h3 class="pitch-title">{{ pitch.title }}</h3>
            <p class="pitch-desc">{{ pitch.description }}</p>

            <div class="pitch-meta">
              <div class="author-row">
                <span class="meta-label">Author:</span>
                <span class="mono author-tag" @click="copyToClipboard(pitch.author)" title="Click to copy">
                  {{ shortenAddress(pitch.author) }}
                </span>
              </div>
              <span class="created-at">{{ pitch.createdAt }}</span>
            </div>

            <!-- CARD STATS -->
            <div class="card-stats">
              <div class="stat-box">
                <span class="box-num">{{ pitch.voteCount }}</span>
                <span class="box-desc">Votes</span>
              </div>
              <div class="stat-box">
                <span class="box-num eth-val">{{ pitch.totalFundsEth }}</span>
                <span class="box-desc">ETH Granted</span>
              </div>
            </div>

            <!-- INTERACTION BUTTONS -->
            <div class="card-actions">
              <button
                @click="handleVote(pitch.id)"
                :disabled="isSubmitting || pitch.userHasVoted"
                class="btn-vote"
                :class="{ 'btn-voted': pitch.userHasVoted }"
              >
                <span v-if="pitch.userHasVoted">✅ Voted</span>
                <span v-else>👍 Upvote (1-tx)</span>
              </button>

              <button
                @click="openTipModal(pitch)"
                :disabled="isSubmitting"
                class="btn-tip"
              >
                💸 Tip ETH
              </button>
            </div>

            <!-- EXPAND TIPS LINK -->
            <div class="tips-accordion-toggle" @click="toggleTips(pitch.id)">
              <span>{{ expandedTips[pitch.id] ? '▲ Hide Supporter Notes' : '💬 View Supporter Notes' }}</span>
            </div>

            <!-- EXPANDED TIPS LIST -->
            <div v-if="expandedTips[pitch.id]" class="tips-drawer">
              <div v-if="!pitchTipsMap[pitch.id] || pitchTipsMap[pitch.id].length === 0" class="no-tips-msg">
                No tips received yet. Be the first to sponsor!
              </div>
              <div v-else class="tips-list">
                <div v-for="(tip, idx) in pitchTipsMap[pitch.id]" :key="idx" class="tip-bubble">
                  <div class="tip-bubble-header">
                    <span class="tip-sender mono">{{ shortenAddress(tip.sender) }}</span>
                    <span class="tip-amount">+{{ tip.amount }} ETH</span>
                  </div>
                  <p class="tip-text">"{{ tip.message }}"</p>
                  <span class="tip-time">{{ tip.timestamp }}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- LIVE BLOCKCHAIN TRANSACTION & EVENT INSPECTOR -->
      <section class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-title">
            <span class="live-pulse"></span>
            <h3>Live Blockchain Activity & State Inspector</h3>
          </div>
          <div class="inspector-actions">
            <span class="inspector-counter">{{ txLogs.length }} actions tracked</span>
            <button @click="txLogs = []" class="btn-clear-log" title="Clear log">Clear</button>
          </div>
        </div>

        <p class="inspector-desc">
          Live stream of transactions, block numbers, gas usage, and events emitted directly by Hardhat EVM.
        </p>

        <div class="inspector-table-wrapper">
          <table class="inspector-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action / Event</th>
                <th>Tx Hash / Block</th>
                <th>Gas Used</th>
                <th>Payload / Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="txLogs.length === 0">
                <td colspan="5" class="table-empty">
                  No actions triggered yet. Try connecting MetaMask, upvoting, or sending a grant above!
                </td>
              </tr>
              <tr v-for="log in txLogs" :key="log.id" class="table-row">
                <td class="mono text-muted">{{ log.timestamp }}</td>
                <td>
                  <span class="log-tag" :class="log.type.startsWith('EVENT') ? 'tag-event' : 'tag-tx'">
                    {{ log.type }}
                  </span>
                </td>
                <td class="mono">
                  <span v-if="log.txHash" class="clickable-hash" @click="copyToClipboard(log.txHash)" :title="log.txHash">
                    {{ shortenAddress(log.txHash) }}
                  </span>
                  <span v-if="log.blockNumber" class="block-badge">Block #{{ log.blockNumber }}</span>
                  <span v-if="!log.txHash && !log.blockNumber" class="text-muted">—</span>
                </td>
                <td class="mono">
                  <span v-if="log.gasUsed" class="gas-badge">{{ log.gasUsed }} gas</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="payload-cell">
                  <span v-if="log.title"><strong>{{ log.title }}</strong> ({{ log.category }})</span>
                  <span v-else-if="log.pitchId">Pitch #{{ log.pitchId }} {{ log.amount ? `— ${log.amount}` : '' }}</span>
                  <span v-else-if="log.account">Account: {{ log.account }}</span>
                  <span v-else-if="log.amount">{{ log.amount }}</span>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </main>

    <!-- MODAL: CREATE NEW PITCH -->
    <div v-if="showNewPitchModal" class="modal-overlay" @click.self="showNewPitchModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Pitch a University Project</h3>
          <button class="modal-close" @click="showNewPitchModal = false">&times;</button>
        </div>

        <form @submit.prevent="handleSubmitPitch" class="modal-form">
          <div class="form-group">
            <label>Project Title *</label>
            <input
              v-model="newTitle"
              type="text"
              placeholder="e.g. Decentralized Study Notes Repository"
              required
              maxlength="80"
            />
          </div>

          <div class="form-group">
            <label>Category</label>
            <select v-model="newCategory">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>Description & Objectives</label>
            <textarea
              v-model="newDescription"
              rows="3"
              placeholder="What problem does this solve for students? What is the technical approach?"
              maxlength="300"
            ></textarea>
          </div>

          <div class="modal-info-box">
            <span>💡 <strong>What happens when you click submit?</strong></span>
            <p>MetaMask prompts you to sign a transaction with your private key. <code>web3Service.createPitchOnChain()</code> sends the data to the smart contract.</p>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showNewPitchModal = false" class="btn-cancel">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary">
              <span v-if="isSubmitting">Publishing to Blockchain...</span>
              <span v-else>🚀 Submit to Smart Contract</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: TIP / MICRO-GRANT -->
    <div v-if="activeTipPitch" class="modal-overlay" @click.self="activeTipPitch = null">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Send Micro-Grant in ETH</h3>
          <button class="modal-close" @click="activeTipPitch = null">&times;</button>
        </div>

        <div class="modal-body">
          <p class="tip-subhead">
            Sponsoring <strong>{{ activeTipPitch.title }}</strong>
          </p>

          <div class="recipient-box">
            <span class="label">Student Recipient Address:</span>
            <span class="mono val">{{ activeTipPitch.author }}</span>
          </div>

          <div class="amount-presets">
            <button
              v-for="amt in ['0.05', '0.1', '0.25', '0.5']"
              :key="amt"
              type="button"
              class="preset-btn"
              :class="{ 'preset-active': tipAmount === amt }"
              @click="tipAmount = amt"
            >
              {{ amt }} ETH
            </button>
          </div>

          <div class="form-group">
            <label>Grant Amount (ETH)</label>
            <input v-model="tipAmount" type="number" step="0.01" min="0.001" />
          </div>

          <div class="form-group">
            <label>Encouragement Message</label>
            <input
              v-model="tipMessage"
              type="text"
              placeholder="e.g. Great initiative! Funding for hardware prototypes."
            />
          </div>

          <div class="modal-info-box">
            <span>⚡ <strong>Atomic Disintermediation:</strong></span>
            <p>Calls <code>web3Service.tipPitchOnChain()</code> which attaches native ETH via Solidity <code>msg.value</code> directly to the student author.</p>
          </div>

          <div class="modal-actions">
            <button type="button" @click="activeTipPitch = null" class="btn-cancel">Cancel</button>
            <button @click="handleSendTip" :disabled="isSubmitting" class="btn-tip-confirm">
              <span v-if="isSubmitting">Transferring ETH...</span>
              <span v-else>💸 Send {{ tipAmount }} ETH</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* NAVBAR */
.navbar {
  background-color: #ffffff;
  border-bottom: 1px solid var(--border-color);
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-badge {
  background-color: var(--brand-light);
  color: var(--brand-primary);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logo-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
  border-left: 1px solid var(--border-color);
  padding-left: 12px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.network-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.network-ok {
  background-color: var(--success-light);
  color: var(--success-color);
}

.network-warn {
  background-color: var(--warning-light);
  color: var(--warning-color);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.btn-switch-network {
  background-color: var(--warning-color);
  color: #ffffff;
  padding: 8px 14px;
  font-size: 0.85rem;
}

.account-pill {
  display: flex;
  align-items: center;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 9999px;
  overflow: hidden;
  font-size: 0.85rem;
}

.account-balance {
  padding: 6px 12px;
  font-weight: 700;
  color: var(--success-color);
  border-right: 1px solid var(--border-color);
}

.account-address {
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.account-address:hover {
  background-color: #e2e8f0;
}

.btn-connect {
  background-color: #f97316;
  color: #ffffff;
  padding: 10px 18px;
  font-size: 0.95rem;
}

.btn-connect:hover {
  background-color: #ea580c;
}

/* ALERTS */
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

/* MAIN CONTAINER */
.main-container {
  max-width: 1200px;
  width: 100%;
  margin: 24px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* PRESENTATION EDUCATIONAL CONCEPT CARD */
.concept-card {
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.concept-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-accent {
  background-color: #e0e7ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.btn-text-toggle {
  background: none;
  color: var(--brand-primary);
  font-size: 0.85rem;
}

.concept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.concept-step {
  background-color: var(--bg-subtle);
  border-radius: 8px;
  padding: 14px;
  border-left: 3px solid var(--brand-primary);
}

.step-num {
  width: 22px;
  height: 22px;
  background-color: var(--brand-primary);
  color: #ffffff;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.concept-step h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.concept-step p {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

/* STATS BAR */
.stats-bar {
  display: flex;
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 24px;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.highlight-eth {
  color: var(--success-color);
}

.btn-primary {
  background-color: var(--brand-primary);
  color: #ffffff;
  padding: 10px 20px;
  font-size: 0.95rem;
}

.btn-primary:hover {
  background-color: var(--brand-primary-hover);
}

/* PITCHES SECTION */
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

.pitch-card {
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.pitch-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.pitch-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.pitch-category {
  font-size: 0.75rem;
  font-weight: 700;
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 3px 8px;
  border-radius: 4px;
}

.pitch-id {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.pitch-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.pitch-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.45;
  margin-bottom: 16px;
  flex-grow: 1;
}

.pitch-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-color);
}

.author-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-label {
  color: var(--text-muted);
}

.author-tag {
  background-color: var(--bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.author-tag:hover {
  background-color: #e2e8f0;
}

.created-at {
  color: var(--text-muted);
}

.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background-color: var(--bg-subtle);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 16px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.box-num {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.box-num.eth-val {
  color: var(--success-color);
}

.box-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-vote {
  background-color: #f1f5f9;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px;
  font-size: 0.88rem;
}

.btn-vote:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.btn-voted {
  background-color: var(--success-light);
  color: var(--success-color);
  border-color: #a7f3d0;
}

.btn-tip {
  background-color: var(--success-light);
  color: var(--success-color);
  border: 1px solid #a7f3d0;
  padding: 8px;
  font-size: 0.88rem;
}

.btn-tip:hover:not(:disabled) {
  background-color: #d1fae5;
}

.tips-accordion-toggle {
  margin-top: 12px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-primary);
  cursor: pointer;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.tips-drawer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.no-tips-msg {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 6px 0;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.tip-bubble {
  background-color: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
}

.tip-bubble-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.tip-amount {
  font-weight: 700;
  color: var(--success-color);
}

.tip-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-style: italic;
}

.tip-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: block;
  text-align: right;
}

/* LIVE INSPECTOR CARD */
.inspector-card {
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 40px;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.inspector-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 6px 0 16px 0;
}

.inspector-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.inspector-counter {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn-clear-log {
  background: none;
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.btn-clear-log:hover {
  background-color: var(--bg-subtle);
}

.inspector-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.inspector-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}

.inspector-table th {
  background-color: #f8fafc;
  padding: 10px 14px;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.inspector-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.table-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px !important;
}

.log-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tag-tx {
  background-color: #eef2ff;
  color: #4338ca;
}

.tag-event {
  background-color: #ecfdf5;
  color: #047857;
}

.clickable-hash {
  color: var(--brand-primary);
  cursor: pointer;
  margin-right: 6px;
}

.clickable-hash:hover {
  text-decoration: underline;
}

.block-badge {
  background-color: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.gas-badge {
  background-color: #fff7ed;
  color: #c2410c;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* MODALS */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background-color: #ffffff;
  border-radius: 14px;
  width: 100%;
  max-width: 500px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.modal-close {
  background: none;
  font-size: 1.4rem;
  color: var(--text-muted);
}

.modal-form, .modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.modal-info-box {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 0.82rem;
  color: #1e40af;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-cancel {
  background-color: #f1f5f9;
  color: var(--text-secondary);
  padding: 10px 16px;
}

.btn-tip-confirm {
  background-color: var(--success-color);
  color: #ffffff;
  padding: 10px 18px;
}

.btn-tip-confirm:hover {
  background-color: #047857;
}

.recipient-box {
  background-color: var(--bg-subtle);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recipient-box .val {
  word-break: break-all;
  font-weight: 600;
}

.amount-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.preset-btn {
  background-color: #f1f5f9;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px 4px;
  font-size: 0.85rem;
}

.preset-active {
  background-color: var(--brand-light);
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  font-weight: 700;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .nav-right {
    width: 100%;
    justify-content: space-between;
  }
  .pitches-grid {
    grid-template-columns: 1fr;
  }
}
</style>
