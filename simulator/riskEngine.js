const HIGH_AMOUNT_THRESHOLD = 1000;
const NEW_WALLET_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const RAPID_TX_WINDOW_MS = 10 * 1000; // 10 seconds
const RAPID_TX_LIMIT = 3;

/**
 * Analyzes a transaction and calculates a risk score and risk flags.
 * @param {object} tx - The transaction details { amount, timestamp }
 * @param {object} senderWallet - The sender wallet state { createdAt, txHistory }
 * @returns {object} { riskScore, flags, isSuspicious }
 */
export function analyzeTransaction(tx, senderWallet) {
  const flags = [];
  
  if (!senderWallet) {
    return {
      riskScore: 99,
      flags: ['UNKNOWN_SENDER_WALLET'],
      isSuspicious: true
    };
  }

  // Base score starting around 10 with a slight random variation (-2 to +2)
  let score = 10 + (Math.floor(Math.random() * 5) - 2);

  // 1. Check if amount is unusually high
  if (tx.amount > HIGH_AMOUNT_THRESHOLD) {
    flags.push('HIGH_AMOUNT');
    score += 40;
  }

  // 2. Check if wallet is newly created
  const walletAgeMs = Date.now() - new Date(senderWallet.createdAt).getTime();
  if (walletAgeMs < NEW_WALLET_THRESHOLD_MS) {
    flags.push('NEW_WALLET');
    score += 30;
  }

  // 3. Check for multiple rapid transactions
  // Filter sender's transactions in the last 10 seconds
  const now = Date.now();
  const recentTxs = (senderWallet.txHistory || []).filter(historyTx => {
    const txAgeMs = now - new Date(historyTx.timestamp).getTime();
    return txAgeMs < RAPID_TX_WINDOW_MS;
  });

  if (recentTxs.length >= RAPID_TX_LIMIT) {
    flags.push('RAPID_TRANSACTIONS');
    score += 40;
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  return {
    riskScore: score,
    flags,
    isSuspicious: score > 50
  };
}
