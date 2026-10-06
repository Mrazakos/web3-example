<script setup lang="ts">
import { ref } from 'vue';

const showDetails = ref(true);
</script>

<template>
  <section class="concept-card">
    <div class="concept-header" @click="showDetails = !showDetails">
      <div class="concept-title">
        <span class="badge-accent">Presenter Guide</span>
        <h3>How this Web3 dApp Works "Under the Hood"</h3>
      </div>
      <button class="btn-text-toggle">{{ showDetails ? 'Hide Details ▲' : 'Show Details ▼' }}</button>
    </div>

    <div v-if="showDetails" class="concept-grid">
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
        <p>Tips in ETH flow directly to the creator via <code>msg.value</code> without bank processing delays or fees.</p>
      </div>
      <div class="concept-step">
        <div class="step-num">4</div>
        <h4>Modular TypeScript Services</h4>
        <p>Clean separation between UI components and typed Ethers.js services (<code>pitchContractService.ts</code>).</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
</style>
