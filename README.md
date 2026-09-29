# 🎓 Campus IdeaHub — Educational Web3 & Smart Contract Demo

A complete, presentation-ready Web3 decentralized application (dApp) built for university students to demonstrate core blockchain concepts:
- **Immutability & Decentralized State**: Student project pitches and votes stored on-chain without any central database.
- **Cryptographic Identity & Sybil-Resistant Voting**: 1-wallet-1-vote enforced by smart contract logic (`mapping(uint256 => mapping(address => bool))`).
- **Disintermediation & Native ETH Micro-Grants**: Direct peer-to-peer value transfer (`msg.value`) to student authors without middlemen or banking delays.
- **Event-Driven Architecture**: Contracts emitting indexed events (`PitchCreated`, `Voted`, `PitchFunded`) that update the web frontend in real time.
- **Live Block & Transaction Inspector**: On-screen table displaying transaction hashes, gas consumption, and block numbers as they are mined on the local EVM.

---

## 🛠️ Tech Stack

- **Smart Contract**: Solidity `0.8.24` (with custom gas-efficient errors and NatSpec documentation).
- **Local Blockchain**: [Hardhat](https://hardhat.org/) (`localhost:8545`, Chain ID `31337`).
- **Automated Tests**: Mocha + Chai + Ethers.js v6.
- **Frontend**: [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) + [Ethers.js v6](https://docs.ethers.org/v6/).
- **Wallet Support**: MetaMask (with 1-click network switcher and account balance tracker).

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
Run from the root project folder:
```bash
npm install
npm run frontend:install
```

### Step 2: Start the Local Blockchain Node
Open **Terminal 1** and start the local EVM node:
```bash
npm run node
```
> Hardhat starts a local JSON-RPC server at `http://127.0.0.1:8545` and prints **20 pre-funded test accounts** (each loaded with 10,000 ETH). Keep this terminal open!

### Step 3: Deploy the Smart Contract & Seed Demo Data
Open **Terminal 2** and deploy to your local node:
```bash
npm run deploy
```
This command automatically:
1. Deploys `CampusPitches.sol` to the local chain.
2. Exports the contract address and JSON ABI directly into `frontend/src/contracts/`.
3. Seeds 3 realistic student project ideas with sample votes and micro-grants so the presentation has data right away.

### Step 4: Launch the Frontend
Open **Terminal 3** and start the Vite development server:
```bash
npm run frontend:dev
```
Open your browser to: **`http://localhost:5173`**

---

## 🦊 Setting Up MetaMask for Localhost

### 1. Add / Switch to Hardhat Localhost Network
The frontend includes a **⚡ Switch to Hardhat** button that will automatically prompt MetaMask to add and switch to the local chain.
If you prefer adding it manually:
- **Network Name**: `Hardhat Localhost`
- **New RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

### 2. Import Hardhat Test Accounts
To interact as different students/professors during your lecture, import one or more default Hardhat private keys into MetaMask:

| Account | Role in Demo | Address | Private Key |
| :--- | :--- | :--- | :--- |
| **Account #0** | Project Creator | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Account #1** | Student Voter | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Account #2** | Sponsor / Professor | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b93908f298505fe09f21002fb67597fa502b70272101ee82441` |

> In MetaMask: Click Account Icon -> **Add account or hardware wallet** -> **Import account** -> Paste the Private Key.

---

## 🧪 Running Automated Tests

Run the full smart contract test suite covering pitch creation, single-voting enforcement, ETH tipping, and gas edge cases:
```bash
npm test
```

Expected output:
```text
  CampusPitches Smart Contract
    Deployment
      ✔ Should start with 0 pitches
      ✔ Should return an empty array for getAllPitches
    Pitch Creation
      ✔ Should allow a student to submit a new pitch and emit PitchCreated
      ✔ Should revert if title is empty
    Voting (1 Vote per Wallet)
      ✔ Should allow a user to vote and increment voteCount
      ✔ Should prevent the same wallet from voting twice
      ✔ Should allow multiple distinct addresses to vote
      ✔ Should revert if voting for non-existent pitch
    Micro-Grants & Tipping (Native ETH Value Transfer)
      ✔ Should transfer native ETH directly to the student author and record the tip
      ✔ Should revert if tip amount is zero
      ✔ Should revert when tipping a non-existent pitch

  11 passing
```

---

## 📂 Project Structure

```
web3-example/
├── contracts/
│   └── CampusPitches.sol        # Smart contract with NatSpec educational comments
├── scripts/
│   └── deploy.js               # Deployment & demo data seeding script
├── test/
│   └── CampusPitches.test.js   # Automated unit tests for Solidity contract
├── frontend/
│   ├── src/
│   │   ├── contracts/          # Auto-generated contract address and ABI
│   │   ├── App.vue             # Light-themed presentation UI with Tx Inspector
│   │   ├── main.js             # Vue 3 mounting
│   │   └── style.css           # Presentation-grade CSS styles
│   ├── index.html              # HTML shell with Google Fonts
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Frontend dependencies
├── hardhat.config.js           # Hardhat configuration (Solidity 0.8.24, Chain 31337)
├── package.json                # Root scripts and dev dependencies
├── PRESENTATION_GUIDE.md       # 15-minute lecture notes & talking points for students
└── README.md                   # This setup and reference manual
```

---

## 📖 Presentation Guide
See [`PRESENTATION_GUIDE.md`](./PRESENTATION_GUIDE.md) for a ready-to-use 15-minute lecture cheat sheet, slide outline, and Q&A talking points.
