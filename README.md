# 🛡️ TxGuard — Know Before You Send

> AI-powered blockchain wallet security scanner built for **Stacks Mainnet** and optimized for **Bitcoin L2s**.

[![Live App](https://img.shields.io/badge/Live%20App-txguard--gules.vercel.app-orange?style=for-the-badge)](https://txguard-gules.vercel.app)
[![Stacks Mainnet](https://img.shields.io/badge/Stacks-Mainnet-5546FF?style=for-the-badge&logo=stacks)](https://explorer.hiro.so/txid/SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry?chain=mainnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 🔍 What is TxGuard?

TxGuard is a **pay-as-you-go AI wallet security scanner** that analyzes any blockchain wallet address and returns an instant risk score, scam detection alerts, and behavioral analysis — powered by Groq AI and GoPlus Security.

Built for the everyday crypto user — who need to verify a wallet before sending funds.

> "Don't lose your crypto to scams. Scan first."

---

## 📁 Repository Structure

This repository is organized as a monorepo containing three core components:

*   **`web/`**: The main React + Vite frontend application deployed on Vercel. Includes serverless backend API endpoints for secure AI risk scoring and Etherscan fetching.
*   **`txguard-stacks/`**: Clarity smart contracts for public audit logs, enabling wallet scan records to be permanently registry-audited on Stacks Mainnet. Includes a comprehensive Vitest test suite.
*   **`simulator/`**: A lightweight Node.js + Express mock blockchain simulator used to test and verify transaction monitoring and risk engine triggers locally.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Risk Scoring** | Groq Llama-3 generates plain English risk assessments (0–100) |
| 🛡️ **GoPlus Security** | Scans against blacklists, phishing, honeypots, approval abuse |
| ⛓️ **5 Chains** | Ethereum, BNB Chain, Solana, Bitcoin, and Stacks |
| 🧾 **Onchain Receipts** | Auditable scan records logged to Stacks Mainnet |
| 💬 **Ask AI** | Chat with TxGuard AI about any scanned wallet |
| 📊 **Transaction Breakdown** | Categorizes wallet activity — Transfers, DeFi, Swap, NFT, Stablecoin |
| 📜 **Transaction History** | Shows recent transfers with sender/receiver details, amount + asset, relative timestamps, chain-specific status badges, and explorer links |
| 🎛️ **Multi-Wallet Dashboard** | Manage and scan multiple wallets concurrently with persistent local storage caching and live background reloading |
| 🛡️ **Chain-Specific Validation** | Regex address formatting verification for Ethereum, BNB, Solana, Bitcoin, and Stacks formats to prevent erroneous transfers |
| 🔊 **Hybrid Web TTS** | Hybrid Text-to-Speech system with HTML5 Audio fallback for mobile webview compatibility |

---

### 1. Stacks Auditing Registry Contract
| Property | Value |
|---|---|
| **Network** | Stacks Mainnet |
| **Contract Address** | [`SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry`](https://explorer.hiro.so/txid/SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry?chain=mainnet) |
| **Type** | `registry.clar` — Security scan registry contract |

---

## ⚙️ Local Development & Setup

### 1. React Web Application (`web/`)

#### Prerequisites
- Node.js v18+
- Groq API key (from [console.groq.com](https://console.groq.com))
- Etherscan API key (from [etherscan.io](https://etherscan.io))

#### Installation
```bash
# Clone the repository
git clone https://github.com/jotel-dev/txguard.git
cd txguard/web

# Install packages
npm install

# Create environment configuration
cp .env.example .env
# Open .env and add VITE_GROQ_API_KEY and VITE_ETHERSCAN_API_KEY

# Start server
npm run dev
```

### 2. Stacks Smart Contracts (`txguard-stacks/`)
To compile, run coverage, and run tests for the Stacks auditing contracts:
```bash
cd txguard-stacks
npm install
npm test
```

### 3. Local Mock Blockchain Simulator (`simulator/`)
To test the transaction lifecycle, block delays, and behavioral risk flags locally:
```bash
cd simulator
npm install
npm start  # Runs the Express simulator server on port 3000

# In a separate terminal, run integration test validations
npm test
```

---

## 🔐 How Risk Scoring Works

```
Final Score = GoPlus Score (70%) + Behavioral Score (30%)

GoPlus Flags:          Behavioral Signals:
- Blacklisted  +80     - New wallet + high balance  +20
- Phishing     +75     - Zero transactions          +10
- Ransomware   +85     - Bot-like volume            +15
- Mixer        +40     - Established wallet         -10
- Honeypot     +50     - Normal activity pattern    -5

Score Ranges:
0–25   → ✅ SAFE
26–50  → ⚠️ CAUTION
51–75  → 🚨 SUSPICIOUS
76–100 → 🔴 DANGEROUS
```

---

## 🗺️ Roadmap

- [x] AI wallet scanning — ETH, BNB, SOL, BTC, Stacks
- [x] GoPlus security integration
- [x] Onchain scan receipts
- [x] Stacks / Bitcoin L2 support
- [x] Transaction History tab (transfer list, copy addresses, status badges)
- [x] Stuck transaction detection (stuck EVM txs & low-fee BTC txs warnings)
- [x] Multi-wallet dashboard with persistence and live refreshing
- [x] Chain-specific address validation checks (regex formats)
- [ ] Telegram Bot (@TxGuardBot)
- [ ] Community scam reporting

---

## 🌍 Why TxGuard?

Millions of users across emerging markets are new to crypto and vulnerable to scams. Existing security tools are desktop-first, require subscriptions, and speak to experienced users.

TxGuard is built for **mobile-first, pay-as-you-go, plain language** security — the right tool for the right people.

---

## 📄 License

MIT © [jotel-dev](https://github.com/jotel-dev)

---

## 🔗 Links

- 🌐 **Live App:** [txguard-gules.vercel.app](https://txguard-gules.vercel.app)
- 🐦 **Twitter:** [@TxGuardBot](https://twitter.com/TxGuardBot) coming soon
- 💬 **Telegram Bot:** [@TxGuardBot](https://t.me/TxGuardBot) coming soon

---

*Built with ❤️ for the Stacks ecosystem · Proof of Ship Season 2*
