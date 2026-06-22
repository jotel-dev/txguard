import express from 'express';
import { 
  createWallet, 
  getWallet, 
  sendTransaction, 
  getTransaction, 
  listWallets, 
  listTransactions,
  seedData
} from './blockchain.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing
app.use(express.json());

// Seed initial test data on startup
seedData();

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// GET / - Info/Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TX Guard Mock Blockchain Simulator',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      wallets: {
        list: 'GET /api/wallets',
        create: 'POST /api/wallets (body: { initialBalance })',
        get: 'GET /api/wallets/:address'
      },
      transactions: {
        list: 'GET /api/transactions',
        send: 'POST /api/transactions (body: { from, to, amount })',
        get: 'GET /api/transactions/:hash'
      }
    }
  });
});

// ── WALLET ENDPOINTS ──

// POST /api/wallets - Create a new wallet
app.post('/api/wallets', (req, res) => {
  try {
    const { initialBalance } = req.body;
    const balance = initialBalance !== undefined ? Number(initialBalance) : 100;
    
    if (isNaN(balance) || balance < 0) {
      return res.status(400).json({ error: 'Initial balance must be a non-negative number.' });
    }

    const wallet = createWallet(balance);
    res.status(201).json({
      message: 'Wallet created successfully.',
      wallet: {
        address: wallet.address,
        balance: wallet.balance,
        createdAt: wallet.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallets - List all wallets
app.get('/api/wallets', (req, res) => {
  try {
    res.json({ wallets: listWallets() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallets/:address - Get a wallet details
app.get('/api/wallets/:address', (req, res) => {
  try {
    const wallet = getWallet(req.params.address);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }
    res.json({
      address: wallet.address,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      txCount: wallet.txHistory.length,
      lastTxTime: wallet.lastTxTime,
      txHistory: wallet.txHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRANSACTION ENDPOINTS ──

// POST /api/transactions - Send a transaction
app.post('/api/transactions', (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'parameters "from" and "to" are required.' });
    }
    if (amount === undefined) {
      return res.status(400).json({ error: 'parameter "amount" is required.' });
    }

    const tx = sendTransaction(from, to, amount);
    
    res.status(202).json({
      message: 'Transaction submitted.',
      transaction: tx
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/transactions - List all transactions
app.get('/api/transactions', (req, res) => {
  try {
    res.json({ transactions: listTransactions() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:hash - Check transaction status/details
app.get('/api/transactions/:hash', (req, res) => {
  try {
    const tx = getTransaction(req.params.hash);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  TX Guard Mock Blockchain Simulator Running      `);
  console.log(`  Local Address: http://localhost:${PORT}          `);
  console.log(`==================================================`);
});
