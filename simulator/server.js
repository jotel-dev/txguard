import express from 'express';
import { pathToFileURL } from 'node:url';
import { 
  createWallet, 
  getWallet, 
  sendTransaction, 
  getTransaction, 
  listWallets, 
  listTransactions,
  seedData
} from './blockchain.js';

export const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing
app.use(express.json({ limit: '8kb' }));
app.use((req, res, next) => { res.setHeader('X-TxGuard-Mode', 'mock-simulator'); next(); });

// Seed initial test data on startup

// Logger middleware
app.use((req, res, next) => {
  console.log(`[Mock simulator] ${req.method} ${req.path.split('/')[2] || 'info'}`);
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
    
    if (!Number.isFinite(balance) || balance < 0) {
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wallets - List all wallets
app.get('/api/wallets', (req, res) => {
  try {
    res.json({ wallets: listWallets() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Keep malformed local fixture inputs out of stack traces and HTML error responses.
app.use((error, req, res, _next) => {
  const status = error.status === 413 ? 413 : 400;
  res.status(status).json({ error: status === 413 ? 'Mock request too large.' : 'Invalid mock JSON payload.' });
});

// Start listening
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
seedData();
app.listen(PORT, '127.0.0.1', () => {
  console.log(`==================================================`);
  console.log(`  TX Guard Mock Blockchain Simulator Running      `);
  console.log(`  Local Address: http://localhost:${PORT}          `);
  console.log(`==================================================`);
});
}
