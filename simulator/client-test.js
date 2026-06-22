import { setTimeout } from 'timers/promises';

// Start the Express server dynamically by importing it
console.log('[Test] Launching simulator server...');
await import('./server.js');

// Helper to poll tx status until confirmed
async function pollTxStatus(hash) {
  console.log(`[Test] Polling transaction status for: ${hash}`);
  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`http://localhost:3000/api/transactions/${hash}`);
    const tx = await res.json();
    console.log(`  - Attempt ${attempt}: status = ${tx.status} (Confirmed in: ${tx.confirmedAt || 'Pending'})`);
    if (tx.status !== 'pending') {
      return tx;
    }
    await setTimeout(1500); // Wait 1.5s
  }
  throw new Error('Transaction timed out in pending state.');
}

async function runTests() {
  try {
    const BASE_URL = 'http://localhost:3000/api';
    console.log('\n--- 1. Testing Info/Welcome ---');
    const infoRes = await fetch('http://localhost:3000/');
    const info = await infoRes.json();
    console.log('Server info:', info);

    console.log('\n--- 2. Listing Seeded Wallets ---');
    const listWalletsRes = await fetch(`${BASE_URL}/wallets`);
    const walletsData = await listWalletsRes.json();
    console.log('Seeded Wallets:', walletsData.wallets);

    const walletA = walletsData.wallets.find(w => w.address.toLowerCase() === '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'.toLowerCase());
    const walletB = walletsData.wallets.find(w => w.address.toLowerCase() === '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase());
    
    console.log('Wallet A (Sender):', walletA);
    console.log('Wallet B (Recipient):', walletB);

    console.log('\n--- 3. Creating a New Wallet (Wallet C) ---');
    const createWalletRes = await fetch(`${BASE_URL}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalance: 200 })
    });
    const walletCData = await createWalletRes.json();
    const walletC = walletCData.wallet;
    console.log('Wallet C (Newly Created):', walletC);

    console.log('\n--- 4. Sending a Normal Transaction ---');
    console.log(`Sending 50 units from Wallet A to Wallet B...`);
    const tx1Res = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: walletA.address,
        to: walletB.address,
        amount: 50
      })
    });
    const tx1Data = await tx1Res.json();
    console.log('Normal Tx Submission Response:', tx1Data);
    
    // Assert status is pending and risk is low
    if (tx1Data.transaction.status !== 'pending') console.error('Error: Transaction should start as pending.');
    console.log(`Risk Score: ${tx1Data.transaction.riskScore}, Flags: ${JSON.stringify(tx1Data.transaction.riskFlags)}`);

    // Poll until transaction confirmed
    const tx1Confirmed = await pollTxStatus(tx1Data.transaction.hash);
    console.log('Tx1 Confirmed State:', tx1Confirmed);

    // Verify balances updated
    const balARes = await fetch(`${BASE_URL}/wallets/${walletA.address}`);
    const balBRes = await fetch(`${BASE_URL}/wallets/${walletB.address}`);
    const walletAUpdate = await balARes.json();
    const walletBUpdate = await balBRes.json();
    console.log(`Balances update - Wallet A: ${walletAUpdate.balance} (Expected 4950), Wallet B: ${walletBUpdate.balance} (Expected 150)`);

    console.log('\n--- 5. Triggering Risk: HIGH_AMOUNT ---');
    console.log(`Sending 1500 units from Wallet A to Wallet B...`);
    const highAmtTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: walletA.address,
        to: walletB.address,
        amount: 1500
      })
    });
    const highAmtTxData = await highAmtTxRes.json();
    console.log('High Amount Tx Response:', highAmtTxData);
    console.log(`Flags: ${JSON.stringify(highAmtTxData.transaction.riskFlags)}, Suspicious: ${highAmtTxData.transaction.isSuspicious}`);
    if (!highAmtTxData.transaction.riskFlags.includes('HIGH_AMOUNT')) {
      console.error('Error: HIGH_AMOUNT flag was not triggered!');
    }

    console.log('\n--- 6. Triggering Risk: NEW_WALLET ---');
    console.log(`Sending 20 units from newly created Wallet C to Wallet B...`);
    const newWalletTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: walletC.address,
        to: walletB.address,
        amount: 20
      })
    });
    const newWalletTxData = await newWalletTxRes.json();
    console.log('New Wallet Tx Response:', newWalletTxData);
    console.log(`Flags: ${JSON.stringify(newWalletTxData.transaction.riskFlags)}, Suspicious: ${newWalletTxData.transaction.isSuspicious}`);
    if (!newWalletTxData.transaction.riskFlags.includes('NEW_WALLET')) {
      console.error('Error: NEW_WALLET flag was not triggered!');
    }

    console.log('\n--- 7. Triggering Risk: RAPID_TRANSACTIONS ---');
    console.log('Sending multiple transactions rapidly (1.5s intervals) from Wallet A to Wallet B...');
    
    const sendTxPromise = () => fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: walletA.address,
        to: walletB.address,
        amount: 1
      })
    }).then(r => r.json());

    const t1 = await sendTxPromise();
    console.log(`Tx 1 sent, score: ${t1.transaction.riskScore}, flags: ${JSON.stringify(t1.transaction.riskFlags)}`);
    
    const t2 = await sendTxPromise();
    console.log(`Tx 2 sent, score: ${t2.transaction.riskScore}, flags: ${JSON.stringify(t2.transaction.riskFlags)}`);
    
    const t3 = await sendTxPromise();
    console.log(`Tx 3 sent, score: ${t3.transaction.riskScore}, flags: ${JSON.stringify(t3.transaction.riskFlags)}`);
    
    const t4 = await sendTxPromise();
    console.log(`Tx 4 sent (should flag rapid!), score: ${t4.transaction.riskScore}, flags: ${JSON.stringify(t4.transaction.riskFlags)}`);
    
    if (!t4.transaction.riskFlags.includes('RAPID_TRANSACTIONS')) {
      console.error('Error: RAPID_TRANSACTIONS flag was not triggered!');
    } else {
      console.log('Success: RAPID_TRANSACTIONS triggered correctly!');
    }

    console.log('\nAll tests executed. Exiting.');
    process.exit(0);

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

// Delay start for half a second to ensure server is running
setTimeout(500).then(runTests);
