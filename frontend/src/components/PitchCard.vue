<script setup lang="ts">
import type { Pitch, Tip } from '../types';

defineProps<{
  pitch: Pitch;
  isSubmitting: boolean;
  expanded: boolean;
  tips: Tip[] | undefined;
}>();

const emit = defineEmits<{
  (e: 'vote', id: number): void;
  (e: 'openTip', pitch: Pitch): void;
  (e: 'toggleTips', id: number): void;
  (e: 'copy', text: string): void;
}>();

function shorten(addr: string): string {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}
</script>

<template>
  <div class="pitch-card">
    <div class="pitch-card-top">
      <span class="pitch-category">{{ pitch.category }}</span>
      <span class="pitch-id">#{{ pitch.id }}</span>
    </div>

    <h3 class="pitch-title">{{ pitch.title }}</h3>
    <p class="pitch-desc">{{ pitch.description }}</p>

    <div class="pitch-meta">
      <div class="author-row">
        <span class="meta-label">Author:</span>
        <span class="mono author-tag" @click="emit('copy', pitch.author)" title="Click to copy">
          {{ shorten(pitch.author) }}
        </span>
      </div>
      <span class="created-at">{{ pitch.createdAt }}</span>
    </div>

    <!-- STATS -->
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

    <!-- ACTIONS -->
    <div class="card-actions">
      <button
        @click="emit('vote', pitch.id)"
        :disabled="isSubmitting || pitch.userHasVoted"
        class="btn-vote"
        :class="{ 'btn-voted': pitch.userHasVoted }"
      >
        <span v-if="pitch.userHasVoted">✅ Voted</span>
        <span v-else>👍 Upvote (1-tx)</span>
      </button>

      <button
        @click="emit('openTip', pitch)"
        :disabled="isSubmitting"
        class="btn-tip"
      >
        💸 Tip ETH
      </button>
    </div>

    <!-- ACCORDION -->
    <div class="tips-accordion-toggle" @click="emit('toggleTips', pitch.id)">
      <span>{{ expanded ? '▲ Hide Supporter Notes' : '💬 View Supporter Notes' }}</span>
    </div>

    <div v-if="expanded" class="tips-drawer">
      <div v-if="!tips || tips.length === 0" class="no-tips-msg">
        No tips received yet. Be the first to sponsor!
      </div>
      <div v-else class="tips-list">
        <div v-for="(tip, idx) in tips" :key="idx" class="tip-bubble">
          <div class="tip-bubble-header">
            <span class="tip-sender mono">{{ shorten(tip.sender) }}</span>
            <span class="tip-amount">+{{ tip.amount }} ETH</span>
          </div>
          <p class="tip-text">"{{ tip.message }}"</p>
          <span class="tip-time">{{ tip.timestamp }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.meta-label { color: var(--text-muted); }

.author-tag {
  background-color: var(--bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.author-tag:hover { background-color: #e2e8f0; }

.created-at { color: var(--text-muted); }

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

.box-num.eth-val { color: var(--success-color); }

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

.btn-vote:hover:not(:disabled) { background-color: #e2e8f0; }

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

.btn-tip:hover:not(:disabled) { background-color: #d1fae5; }

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
</style>
