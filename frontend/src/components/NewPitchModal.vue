<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  show: boolean;
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { title: string; description: string; category: string }): void;
}>();

const title = ref('');
const description = ref('');
const category = ref('Artificial Intelligence');

const categories = [
  'Artificial Intelligence',
  'Sustainability',
  'Robotics & Hardware',
  'Campus Life & Tools',
  'Social Impact'
];

function handleSubmit() {
  if (!title.value.trim()) return;
  emit('submit', {
    title: title.value,
    description: description.value,
    category: category.value
  });
  title.value = '';
  description.value = '';
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Pitch a University Project</h3>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-group">
          <label>Project Title *</label>
          <input
            v-model="title"
            type="text"
            placeholder="e.g. Decentralized Study Notes Repository"
            required
            maxlength="80"
          />
        </div>

        <div class="form-group">
          <label>Category</label>
          <select v-model="category">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Description & Objectives</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="What problem does this solve for students? What is the technical approach?"
            maxlength="300"
          ></textarea>
        </div>

        <div class="modal-info-box">
          <span>💡 <strong>What happens when you click submit?</strong></span>
          <p>MetaMask prompts you to sign a transaction with your private key. <code>pitchContractService.createPitch()</code> sends the data to the smart contract.</p>
        </div>

        <div class="modal-actions">
          <button type="button" @click="emit('close')" class="btn-cancel">Cancel</button>
          <button type="submit" :disabled="isSubmitting" class="btn-primary">
            <span v-if="isSubmitting">Publishing to Blockchain...</span>
            <span v-else>🚀 Submit to Smart Contract</span>
          </button>
        </div>
      </form>
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

.modal-form {
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
</style>
