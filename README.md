# 🛡️ TxGuard — Know Before You Send

> AI-powered blockchain wallet security scanner built for **Celo & Stacks Mainnet** and optimized for **MiniPay & Bitcoin L2s**.

[![Live App](https://img.shields.io/badge/Live%20App-txguard--gules.vercel.app-orange?style=for-the-badge)](https://txguard-gules.vercel.app)
[![Celo Mainnet](https://img.shields.io/badge/Celo-Mainnet-35D07F?style=for-the-badge&logo=celo)](https://celoscan.io/address/0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10)
[![Stacks Mainnet](https://img.shields.io/badge/Stacks-Mainnet-5546FF?style=for-the-badge&logo=stacks)](https://explorer.hiro.so/txid/SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry?chain=mainnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![MiniPay Ready](https://img.shields.io/badge/MiniPay-Ready-blue?style=for-the-badge)](https://txguard-gules.vercel.app)

---

## 🔍 What is TxGuard?

TxGuard is a **pay-as-you-go AI wallet security scanner** that analyzes any blockchain wallet address and returns an instant risk score, scam detection alerts, and behavioral analysis — powered by Groq AI and GoPlus Security.

Built for the everyday crypto user — especially those on **MiniPay** across Africa and emerging markets — who need to verify a wallet before sending funds.

> "Don't lose your crypto to scams. Scan first."

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Risk Scoring** | Groq Llama-3 generates plain English risk assessments (0–100) |
| 🛡️ **GoPlus Security** | Scans against blacklists, phishing, honeypots, approval abuse |
| ⛓️ **5 Chains** | Ethereum, BNB Chain, Solana, Bitcoin, and Celo |
| 💳 **Pay-per-scan** | 0.01 CELO per scan on Celo Mainnet |
| 📱 **MiniPay Native** | Auto-detects MiniPay, connects wallet, handles cUSD gas fees |
| 🧾 **Onchain Receipts** | Scan receipts paid on Celo, and auditable scan records logged to Stacks Mainnet |
| 💬 **Ask AI** | Chat with TxGuard AI about any scanned wallet |
| 📊 **Transaction Breakdown** | Categorizes wallet activity — Transfers, DeFi, Swap, NFT, Stablecoin |
| 📜 **Transaction History** | Shows recent transfers with sender/receiver details, amount + asset, relative timestamps, chain-specific status badges, and explorer links |

---

## 🚀 Live Demo

**Web App:** [txguard-gules.vercel.app](https://txguard-gules.vercel.app)

**Inside MiniPay:**
1. Open MiniPay app
2. Tap the browser icon
3. Go to `txguard-gules.vercel.app`
4. TxGuard auto-detects MiniPay and switches to Celo mode

---

## 📦 Smart Contracts

### 1. Celo Payment Paywall Contract
| Property | Value |
|---|---|
| **Network** | Celo Mainnet |
| **Contract Address** | [`0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10`](https://celoscan.io/address/0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10) |
| **Type** | `TxGuardPayment.sol` — Pay-per-scan contract |
| **Scan Fee** | `0.01 CELO` per scan |
| **Gas Currency** | cUSD (MiniPay compatible) |

### 2. Stacks Auditing Registry Contract
| Property | Value |
|---|---|
| **Network** | Stacks Mainnet |
| **Contract Address** | [`SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry`](https://explorer.hiro.so/txid/SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry?chain=mainnet) |
| **Type** | `registry.clar` — Security scan registry contract |
| **Functionality** | Public auditing for target chains, wallet address, and risk scores |

### Contract Functions

#### 1. Celo Payment Paywall Contract (Solidity)
```solidity
payScan()          // Pay for a wallet scan (payable)
scanFee()          // Get current scan fee
totalScans()       // Total scans processed
updateFee()        // Update fee (owner only)
withdraw()         // Withdraw collected fees (owner only)
```

#### 2. Stacks Auditing Registry Contract (Clarity)
```clarity
(log-scan (chain (string-ascii 16)) (target (string-ascii 64)) (risk-score uint)) ;; Log a new scan (public)
(get-scan (id uint))                                                             ;; Read a single scan by ID (read-only)
(get-scan-count (chain (string-ascii 16)) (target (string-ascii 64)))            ;; Scans for a given (chain, target) pair (read-only)
(get-total-scans)                                                                ;; Total scans logged (read-only)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite |
| **Styling** | Custom CSS — glassmorphism, dark mode, responsive |
| **AI** | Groq API — Llama-3.1-8b-instant |
| **Security DB** | GoPlus Security API |
| **Blockchain Data** | Etherscan V2 API (ETH, BNB, Celo), Solana RPC, Blockstream (BTC) |
| **Smart Contract** | Solidity 0.8.20 — deployed on Celo Mainnet |
| **Web3** | Injected `window.ethereum` — MiniPay & Valora compatible |
| **Hosting** | Vercel |

---

## ⚙️ Local Development

### Prerequisites
- Node.js v18+
- A Groq API key — [console.groq.com](https://console.groq.com)
- An Etherscan API key — [etherscan.io/apis](https://etherscan.io/apis)

### Setup

```bash
# Clone the repo
git clone https://github.com/jotel-dev/txguard.git
cd txguard/web

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Add your API keys to .env

# Start dev server
npm run dev
```

### Environment Variables

Create a `.env` file inside `web/`:

```env
VITE_GROQ_API_KEY=your_groq_api_key
VITE_ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## 📱 Testing Inside MiniPay

1. Start your local dev server (`npm run dev`)
2. Expose your port using ngrok:
```bash
ngrok http 5173
```
3. Copy the `https://...ngrok-free.app` URL
4. Open **MiniPay** on your phone
5. Enable **Developer Mode** — tap the version number repeatedly in Settings → About
6. Go to **Developer Settings → Load Test Page** → paste the ngrok URL
7. Scan a wallet and approve the Celo transaction!

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

- [x] AI wallet scanning — ETH, BNB, SOL, BTC, Celo
- [x] GoPlus security integration
- [x] Pay-per-scan smart contract on Celo Mainnet
- [x] MiniPay hook — auto wallet detection + cUSD gas
- [x] Onchain scan receipts
- [x] Stacks / Bitcoin L2 support
- [x] Transaction History tab (transfer list, copy addresses, status badges)
- [x] Stuck transaction detection (stuck EVM txs & low-fee BTC txs warnings)
- [ ] Telegram Bot (@TxGuardBot)
- [ ] Multi-wallet dashboard
- [ ] Community scam reporting

---

## 🌍 Why TxGuard?

MiniPay has **14M+ users** across Africa and emerging markets — many of whom are new to crypto and vulnerable to scams. Existing security tools are desktop-first, require subscriptions, and speak to experienced users.

TxGuard is built for **mobile-first, pay-as-you-go, plain language** security — the right tool for the right people.

---

## 📄 License

MIT © [jotel-dev](https://github.com/jotel-dev)

---

## 🔗 Links

- 🌐 **Live App:** [txguard-gules.vercel.app](https://txguard-gules.vercel.app)
- 📜 **Contract:** [celoscan.io](https://celoscan.io/address/0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10)
- 🐦 **Twitter:** [@TxGuardBot](https://twitter.com/TxGuardBot) coming soon
- 💬 **Telegram Bot:** [@TxGuardBot](https://t.me/TxGuardBot) coming soon 
 
---

*Built with ❤️ for Celo and Stacks ecosystems · Proof of Ship Season 2*