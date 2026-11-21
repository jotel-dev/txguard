import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createWallet, sendTransaction } from '../blockchain.js'
import { analyzeTransaction } from '../riskEngine.js'
import { app } from '../server.js'
test('mock scoring is reproducible for fixed state',()=>{
  const sender={createdAt:new Date(0),txHistory:[]}
  assert.deepEqual(analyzeTransaction({amount:50},sender),analyzeTransaction({amount:50},sender))
  assert.equal(analyzeTransaction({amount:50},sender).riskScore,10)
  assert.ok(analyzeTransaction({amount:1001},sender).flags.includes('HIGH_AMOUNT'))
})
test('mock rapid-transfer rule starts at the fourth transfer',()=>{
  const sender={createdAt:new Date(0),txHistory:[{timestamp:new Date()},{timestamp:new Date()}]}
  assert.ok(!analyzeTransaction({amount:1},sender).flags.includes('RAPID_TRANSACTIONS'))
  sender.txHistory.push({timestamp:new Date()})
  assert.ok(analyzeTransaction({amount:1},sender).flags.includes('RAPID_TRANSACTIONS'))
})
test('mock ledger rejects nonfinite and negative balances/amounts',()=>{
  for(const amount of [Infinity,NaN,-1]) assert.throws(()=>createWallet(amount))
  const from=createWallet(100),to=createWallet(0)
  for(const amount of [Infinity,NaN,0,-1,101]) assert.throws(()=>sendTransaction(from.address,to.address,amount))
  assert.equal(from.balance,100)
})
test('mock settlement reserves funds, prevents overspend, and credits once',async()=>{
  const from=createWallet(100),to=createWallet(0)
  const tx=sendTransaction(from.address,to.address,60,{delayMs:5,shouldFail:false})
  assert.equal(tx.status,'pending');assert.equal(from.balance,40);assert.equal(to.balance,0)
  assert.throws(()=>sendTransaction(from.address,to.address,60))
  await new Promise(resolve=>setTimeout(resolve,20))
  assert.equal(to.balance,60);assert.equal(from.balance,40)
})
test('failed mock settlement refunds the sender',async()=>{
  const from=createWallet(100),to=createWallet(0)
  sendTransaction(from.address,to.address,25,{delayMs:5,shouldFail:true})
  await new Promise(resolve=>setTimeout(resolve,20))
  assert.equal(from.balance,100);assert.equal(to.balance,0)
})
test('mock API is labeled, enforces body limit and validates amounts',async()=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening')
  try {
    const root=`http://127.0.0.1:${server.address().port}`
    const info=await fetch(root);assert.match(info.headers.get('X-TxGuard-Mode'),/mock/)
    const create=await fetch(root+'/api/wallets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initialBalance:-1})});assert.equal(create.status,400)
    const huge=await fetch(root+'/api/wallets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:'x'.repeat(9000)})});assert.equal(huge.status,413)
  } finally { await new Promise(resolve=>server.close(resolve)) }
})
