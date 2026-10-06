<script setup lang="ts">
import type { TxLogEntry } from '../types';

defineProps<{
  logs: TxLogEntry[];
}>();

const emit = defineEmits<{
  (e: 'clear'): void;
  (e: 'copy', text: string): void;
}>();

function shorten(addr: string): string {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}
</script>

<template>
  <section class="inspector-card">
    <div class="inspector-header">
      <div class="inspector-title">
        <span class="live-pulse"></span>
        <h3>Live Blockchain Activity & State Inspector</h3>
      </div>
      <div class="inspector-actions">
        <span class="inspector-counter">{{ logs.length }} actions tracked</span>
        <button @click="emit('clear')" class="btn-clear-log" title="Clear log">Clear</button>
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
          <tr v-if="logs.length === 0">
            <td colspan="5" class="table-empty">
              No actions triggered yet. Try connecting MetaMask, upvoting, or sending a grant above!
            </td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="table-row">
            <td class="mono text-muted">{{ log.timestamp }}</td>
            <td>
              <span class="log-tag" :class="log.type.startsWith('EVENT') ? 'tag-event' : 'tag-tx'">
                {{ log.type }}
              </span>
            </td>
            <td class="mono">
              <span v-if="log.txHash" class="clickable-hash" @click="emit('copy', log.txHash)" :title="log.txHash">
                {{ shorten(log.txHash) }}
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
</template>

<style scoped>
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

.btn-clear-log:hover { background-color: var(--bg-subtle); }

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

.tag-tx { background-color: #eef2ff; color: #4338ca; }
.tag-event { background-color: #ecfdf5; color: #047857; }

.clickable-hash {
  color: var(--brand-primary);
  cursor: pointer;
  margin-right: 6px;
}

.clickable-hash:hover { text-decoration: underline; }

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
</style>
