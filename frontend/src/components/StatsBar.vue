<script setup lang="ts">
defineProps<{
  totalProjects: number;
  totalVotes: number;
  totalEthFunded: string;
}>();

const emit = defineEmits<{
  (e: 'openNewPitch'): void;
}>();
</script>

<template>
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-label">Total Projects</span>
      <span class="stat-value">{{ totalProjects }}</span>
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
      <button @click="emit('openNewPitch')" class="btn-primary">
        + Pitch a New Idea
      </button>
    </div>
  </div>
</template>

<style scoped>
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
</style>
