import { getRecentTransactions } from '../src/blockchain.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, chain } = req.query;

  if (!wallet || !chain) {
    return res.status(400).json({ error: 'Wallet and chain parameters are required.' });
  }

  try {
    const transactions = await getRecentTransactions(wallet.trim(), chain);
    return res.status(200).json({ transactions });
  } catch (err) {
    console.error('Fetch transactions failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve transactions: ' + err.message });
  }
}
