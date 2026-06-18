# TxGuard AI — On-Chain Wallet Security Scanner

TxGuard is an AI-powered blockchain security scanner built for the **Celo Mainnet** and optimized for **MiniPay**. It analyzes wallet behavioral history and GoPlus Security databases using an LLM to generate instant risk scores, categorizations, and security alerts.

To align with the Celo pay-as-you-go model, TxGuard utilizes an on-chain transaction contract that charges a tiny fee (0.01 CELO) per scan to query the security model, creating real transaction utility and on-chain activity.

⚡ **Try it inside MiniPay:** Automatically detects the MiniPay environment, connects the user's wallet, and prompts for scan payments.

---

## Deployed Smart Contracts

*   **Network:** Celo Mainnet
*   **Contract Address:** [`0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10`](https://celoscan.io/address/0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10)
*   **Contract Type:** `TxGuardPayment.sol` (Pay-per-scan registry)
*   **Default Fee:** `0.01 CELO` per scan

---

## Features

1.  **AI-Powered Behavioral Scoring**: Connects to the Groq API running Llama-3 to summarize risk assessments in plain English.
2.  **GoPlus Security Integration**: Scans addresses against blacklists, malicious history, phishing reports, approval abuse, and honeypots.
3.  **On-Chain Receipts**: Generates a Celo Mainnet transaction on every scan, displaying the Celoscan receipt link inside the results.
4.  **MiniPay Optimized**: Mobile-first, lightweight responsive layout, fast load times, and automatic wallet session caching.

---

## Tech Stack

*   **Frontend**: React (Vite)
*   **Styling**: Premium custom Vanilla CSS (dark mode, glassmorphism, responsive grid layout)
*   **APIs**: GoPlus Security API, Groq API (Llama-3), Celoscan API (V2)
*   **Web3 Integration**: Injected `window.ethereum` JSON-RPC provider (optimized for MiniPay and Valora wallets)

---

## Development Setup

### 1. Prerequisites
Ensure you have Node.js (v18+) installed.

### 2. Environment Variables
Create a `.env` file inside the `web/` directory:
```env
VITE_GROQ_API_KEY=your_groq_api_key
VITE_ETHERSCAN_API_KEY=your_etherscan_or_celoscan_api_key
```

### 3. Run Locally
```bash
# Navigate to web
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## How to Test inside MiniPay Developer Mode
1. Ensure your local dev server is running (e.g. `localhost:5173`).
2. Expose your port to the web using `ngrok` or similar:
   ```bash
   ngrok http 5173
   ```
3. Copy the secure forwarding URL (`https://...ngrok-free.app`).
4. Open your **MiniPay App** on your mobile device.
5. Enable **Developer Mode** by tapping the version number in the "About" section repeatedly.
6. Open **Developer Settings** -> **Load Test Page** and paste the ngrok URL.
7. Perform a scan and approve the Celo transaction prompt!
