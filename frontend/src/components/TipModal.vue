<script setup lang="ts">
import { ref } from 'vue';
import type { Pitch } from '../types';

defineProps<{
  pitch: Pitch | null;
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'sendTip', payload: { pitchId: number; amountEth: string; message: string }): void;
}>();

const amount = ref('0.1');
const message = ref('Keep up the awesome work! 🚀');

function handleSend(pitchId: number) {
  emit('sendTip', {
    pitchId,
    amountEth: amount.value,
    message: message.value
  });
}
</script>

<template>
  <div v-if="pitch" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Send Micro-Grant in ETH</h3>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <p class="tip-subhead">
          Sponsoring <strong>{{ pitch.title }}</strong>
        </p>

        <div class="recipient-box">
          <span class="label">Student Recipient Address:</span>
          <span class="mono val">{{ pitch.author }}</span>
        </div>

        <div class="amount-presets">
          <button
            v-for="amt in ['0.05', '0.1', '0.25', '0.5']"
            :key="amt"
            type="button"
            class="preset-btn"
            :class="{ 'preset-active': amount === amt }"
            @click="amount = amt"
          >
            {{ amt }} ETH
          </button>
        </div>

        <div class="form-group">
          <label>Grant Amount (ETH)</label>
          <input v-model="amount" type="number" step="0.01" min="0.001" />
        </div>

        <div class="form-group">
          <label>Encouragement Message</label>
          <input
            v-model="message"
            type="text"
            placeholder="e.g. Great initiative! Funding for hardware prototypes."
          />
        </div>

        <div class="modal-info-box">
          <span>⚡ <strong>Atomic Disintermediation:</strong></span>
          <p>Calls <code>pitchContractService.tipPitch()</code> attaching native ETH via <code>msg.value</code> directly to the student author.</p>
        </div>

        <div class="modal-actions">
          <button type="button" @click="emit('close')" class="btn-cancel">Cancel</button>
          <button @click="handleSend(pitch.id)" :disabled="isSubmitting" class="btn-tip-confirm">
            <span v-if="isSubmitting">Transferring ETH...</span>
            <span v-else>💸 Send {{ amount }} ETH</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.modal-header h3 { font-size: 1.15rem; font-weight: 700; }
.modal-close { background: none; font-size: 1.4rem; color: var(--text-muted); }

.modal-body {
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

.btn-tip-confirm:hover { background-color: #047857; }
</style>
