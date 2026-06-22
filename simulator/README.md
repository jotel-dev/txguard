# TX Guard Mock Blockchain Simulator

This is a local, self-contained mock blockchain simulator service built with Node.js and Express. It simulates wallet state management, transaction records, block confirmation delays, and executes security risk assessments modeled for the TX Guard transaction monitoring system.

## Features

1. **Local Wallet Management**: Simulate addresses, balances, creation age, transaction logs, and last transaction activity.
2. **Transaction Life Cycle**:
   - Status transitions from `pending` to `success` (or `failed`) based on a simulated **Block Confirmation Delay** of 3–10 seconds.
   - Generates mock addresses and transaction hashes using secure random byte buffers.
3. **Built-in TX Guard Risk Engine**:
   - Each transaction calculates a dynamic risk score between `0` and `100`.
   - **Suspicious Flags** are assigned and transaction is marked `isSuspicious = true` (score > 50) if any of the following apply:
     - `HIGH_AMOUNT`: Transacting an amount > 1000.
     - `NEW_WALLET`: Sender wallet age is < 5 minutes.
     - `RAPID_TRANSACTIONS`: Sender executed > 3 transactions in the last 10 seconds.

---

## Installation & Setup

1. Navigate to the simulator directory:
   ```bash
   cd simulator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express simulator server (runs on port `3000` by default):
   ```bash
   npm start
   ```

---

## Running Integration Tests

To run the automated client verification script that validates wallet creation, transfer logic, polling states, and all three security risk conditions:
```bash
npm test
```

---

## API Endpoints

### 1. Wallets

#### List Wallets
* **Route**: `GET /api/wallets`
* **Response Example**:
  ```json
  {
    "wallets": [
      {
        "address": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
        "balance": 5000,
        "createdAt": "2025-06-22T02:30:00.000Z",
        "txCount": 0,
        "lastTxTime": null
      }
    ]
  }
  ```

#### Create Wallet
* **Route**: `POST /api/wallets`
* **Body**:
  ```json
  { "initialBalance": 250 }
  ```
* **Response Example**:
  ```json
  {
    "message": "Wallet created successfully.",
    "wallet": {
      "address": "0x4460f64be872ddcc94a9059cbb115f5f5f5f23b8",
      "balance": 250,
      "createdAt": "2026-06-22T02:38:00.000Z"
    }
  }
  ```

#### Get Wallet Details
* **Route**: `GET /api/wallets/:address`
* **Response Example**:
  ```json
  {
    "address": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
    "balance": 5000,
    "createdAt": "2025-06-22T02:30:00.000Z",
    "txCount": 1,
    "lastTxTime": "2026-06-22T02:39:00.000Z",
    "txHistory": [
      {
        "hash": "0xd9059cbb20FFa15Ca89AfA1b855fD2ff4f0...223",
        "type": "send",
        "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "amount": 50,
        "timestamp": "2026-06-22T02:39:00.000Z"
      }
    ]
  }
  ```

---

### 2. Transactions

#### List Transactions
* **Route**: `GET /api/transactions`
* **Response Example**:
  ```json
  {
    "transactions": [
      {
        "hash": "0x53fca1cbfef9c4d8723365431263cbfef9c4d8723365431263cbfe...",
        "from": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
        "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "amount": 50,
        "status": "success",
        "timestamp": "2026-06-22T02:39:00.000Z",
        "confirmedAt": "2026-06-22T02:39:05.000Z",
        "riskScore": 11,
        "riskFlags": [],
        "isSuspicious": false
      }
    ]
  }
  ```

#### Send Transaction (Triggers Risk Engine)
* **Route**: `POST /api/transactions`
* **Body**:
  ```json
  {
    "from": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
    "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "amount": 1500
  }
  ```
* **Response Example (HTTP 202 Accepted)**:
  ```json
  {
    "message": "Transaction submitted.",
    "transaction": {
      "hash": "0x98fca1cbfef9c4d8723365431263cbfef9c4d8723365431263cbfe...",
      "from": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
      "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "amount": 1500,
      "status": "pending",
      "timestamp": "2026-06-22T02:39:10.000Z",
      "confirmedAt": null,
      "riskScore": 51,
      "riskFlags": ["HIGH_AMOUNT"],
      "isSuspicious": true,
      "estimatedDelaySeconds": 5
    }
  }
  ```

#### Check Transaction Status
* **Route**: `GET /api/transactions/:hash`
* **Response Example (Pending)**:
  ```json
  {
    "hash": "0x98fca1cbfef9c4d8723365431263cbfef9c4d8723365431263cbfe...",
    "from": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
    "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "amount": 1500,
    "status": "pending",
    "timestamp": "2026-06-22T02:39:10.000Z",
    "confirmedAt": null,
    "riskScore": 51,
    "riskFlags": ["HIGH_AMOUNT"],
    "isSuspicious": true
  }
  ```
* **Response Example (Confirmed Success)**:
  ```json
  {
    "hash": "0x98fca1cbfef9c4d8723365431263cbfef9c4d8723365431263cbfe...",
    "from": "0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e",
    "to": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "amount": 1500,
    "status": "success",
    "timestamp": "2026-06-22T02:39:10.000Z",
    "confirmedAt": "2026-06-22T02:39:15.000Z",
    "riskScore": 51,
    "riskFlags": ["HIGH_AMOUNT"],
    "isSuspicious": true
  }
  ```
