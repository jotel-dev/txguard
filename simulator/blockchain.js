import crypto from 'crypto';
import { analyzeTransaction } from './riskEngine.js';

export const wallets = new Map();
export const transactions = new Map();

// Helper to generate a fake wallet address
export function generateAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// Helper to generate a fake tx hash
export function generateHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

// Set up sample test data
export function seedData() {
  // Pre-seed some wallets to make it easy to start
  const walletA = createWallet(5000, '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'); // standard sample wallet
  const walletB = createWallet(100, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
  const walletC = createWallet(10, '0xDRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm');
  
  // Make walletA "old" (e.g. 1 year old) so it does not trigger the NEW_WALLET flag
  walletA.createdAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  
  console.log('Seeded wallets:', Array.from(wallets.keys()));
}

export function createWallet(initialBalance = 100, customAddress = null) {
  const address = customAddress || generateAddress();
  
  const wallet = {
    address,
    balance: Number(initialBalance),
    createdAt: new Date(),
    txHistory: [],
    lastTxTime: null
  };
  
  wallets.set(address.toLowerCase(), wallet);
  return wallet;
}

export function getWallet(address) {
  if (!address) return null;
  return wallets.get(address.toLowerCase()) || null;
}

export function getTransaction(hash) {
  if (!hash) return null;
  return transactions.get(hash.toLowerCase()) || null;
}

export function listWallets() {
  return Array.from(wallets.values()).map(w => ({
    address: w.address,
    balance: w.balance,
    createdAt: w.createdAt,
    txCount: w.txHistory.length,
    lastTxTime: w.lastTxTime
  }));
}

export function listTransactions() {
  return Array.from(transactions.values());
}

/**
 * Initiates a transfer between two wallets with risk assessment & block delay simulator.
 * @param {string} from - Sender address
 * @param {string} to - Recipient address
 * @param {number} amount - Amount to send
 * @returns {object} The transaction object
 */
export function sendTransaction(from, to, amount) {
  const sender = getWallet(from);
  const recipient = getWallet(to);
  const numAmount = Number(amount);

  if (!sender) {
    throw new Error(`Sender wallet ${from} not found.`);
  }
  if (!recipient) {
    throw new Error(`Recipient wallet ${to} not found.`);
  }
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a positive number.');
  }
  if (sender.balance < numAmount) {
    throw new Error('Insufficient balance.');
  }

  const hash = generateHash();
  const timestamp = new Date();

  // Create temporary tx body for risk engine
  const txRecord = {
    hash,
    from: sender.address,
    to: recipient.address,
    amount: numAmount,
    status: 'pending',
    timestamp,
    confirmedAt: null
  };

  // Run the TX Guard Risk assessment BEFORE the transaction changes state
  const riskAnalysis = analyzeTransaction(txRecord, sender);
  txRecord.riskScore = riskAnalysis.riskScore;
  txRecord.riskFlags = riskAnalysis.flags;
  txRecord.isSuspicious = riskAnalysis.isSuspicious;

  // Deduct balance from sender immediately to prevent double spending
  sender.balance -= numAmount;
  sender.lastTxTime = timestamp;
  sender.txHistory.push({
    hash,
    type: 'send',
    to: recipient.address,
    amount: numAmount,
    timestamp
  });

  // Store globally
  transactions.set(hash.toLowerCase(), txRecord);

  // Simulated Block Confirmation Delay (3 to 10 seconds)
  const delaySec = Math.floor(Math.random() * 8) + 3; // 3 to 10 seconds
  
  setTimeout(() => {
    const tx = transactions.get(hash.toLowerCase());
    if (tx && tx.status === 'pending') {
      // 2% chance of failure simulator (e.g. simulated network failure)
      const isFailed = Math.random() < 0.02;
      
      if (isFailed) {
        tx.status = 'failed';
        // Refund sender
        sender.balance += numAmount;
        console.log(`[Simulator] Tx ${hash} failed block execution. Refunded sender.`);
      } else {
        tx.status = 'success';
        tx.confirmedAt = new Date();
        
        // Credit recipient
        recipient.balance += numAmount;
        recipient.txHistory.push({
          hash,
          type: 'receive',
          from: sender.address,
          amount: numAmount,
          timestamp: tx.confirmedAt
        });
        
        console.log(`[Simulator] Tx ${hash} confirmed after ${delaySec}s.`);
      }
    }
  }, delaySec * 1000);

  return {
    ...txRecord,
    estimatedDelaySeconds: delaySec
  };
}
