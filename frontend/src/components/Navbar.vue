<script setup lang="ts">
defineProps<{
  account: string;
  balance: string;
  chainId: number | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
}>();

const emit = defineEmits<{
  (e: 'connect'): void;
  (e: 'switchNetwork'): void;
  (e: 'copy', text: string): void;
}>();

function shorten(addr: string): string {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}
</script>

<template>
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
      <button v-if="account && !isCorrectNetwork" @click="emit('switchNetwork')" class="btn-switch-network">
        ⚡ Switch to Hardhat
      </button>

      <!-- Connected Wallet Pill -->
      <div v-if="account" class="account-pill">
        <span class="account-balance">{{ balance }} ETH</span>
        <div class="account-address" @click="emit('copy', account)" title="Click to copy address">
          <span>{{ shorten(account) }}</span>
          <span class="copy-icon">📋</span>
        </div>
      </div>

      <!-- Connect MetaMask Button -->
      <button v-else @click="emit('connect')" :disabled="isConnecting" class="btn-connect">
        <span v-if="isConnecting">Connecting...</span>
        <span v-else>🦊 Connect MetaMask</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
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

.network-ok { background-color: var(--success-light); color: var(--success-color); }
.network-warn { background-color: var(--warning-light); color: var(--warning-color); }

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

.account-address:hover { background-color: #e2e8f0; }

.btn-connect {
  background-color: #f97316;
  color: #ffffff;
  padding: 10px 18px;
  font-size: 0.95rem;
}

.btn-connect:hover { background-color: #ea580c; }
</style>
