import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { bech32, bech32m } from '@scure/base'
import { isValidAddress, formatUnits, explorerLink, walletKey, formatTimestamp } from '../shared/chains.js'
import { evaluateRisk, goplusCheck, SIGNALS } from '../src/riskEngine.js'
import { parseBitcoinTransaction, parseEvmTransaction, parseSolanaTransaction, parseStacksTransaction, getWalletData, getRecentTransactions } from '../src/blockchain.js'
import { createCache, validateScan, fetchJSON } from '../server/http.js'
import { verifyRegistryInterface, verifyRegistryTransaction, CONTRACT } from '../server/registry.js'

const nativeFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = nativeFetch })
const eth = '0x52908400098527886E0F7030069857D2E4169EE7'
const stx = 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM'
const btc = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
const hash = 'a'.repeat(64)
for (const [chain,address] of [['ethereum',eth],['bnb',eth],['bitcoin',btc],['solana','11111111111111111111111111111111'],['stacks',stx],['stacks',stx+'.registry']]) {
  test(`valid ${chain} ${address}`, () => assert.equal(isValidAddress(address,chain),true))
  test(`reject mutated ${chain}`, () => assert.equal(isValidAddress(address.slice(0,-1)+'!',chain),false))
}
test('reject checksum errors and wrong networks', () => {
  assert.equal(isValidAddress('0x52908400098527886E0F7030069857D2E4169Ee7','ethereum'),false)
  assert.equal(isValidAddress(btc.slice(0,-1)+'b','bitcoin'),false)
  assert.equal(isValidAddress(stx.slice(0,-1)+'A','stacks'),false)
  assert.equal(isValidAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM','stacks'),false)
  assert.equal(isValidAddress('1'.repeat(44),'solana'),false)
  assert.equal(isValidAddress(eth,'unknown'),false)
  assert.equal(isValidAddress(stx+'.1bad','stacks'),false)
})
test('SegWit v0 and Taproot checksums and mixed case', () => {
  const v0 = bech32.encode('bc',[0,...bech32.toWords(new Uint8Array(20))])
  const v1 = bech32m.encode('bc',[1,...bech32m.toWords(new Uint8Array(32))])
  assert.equal(isValidAddress(v0,'bitcoin'),true)
  assert.equal(isValidAddress(v1,'bitcoin'),true)
  assert.equal(isValidAddress('bC'+v0.slice(2),'bitcoin'),false)
  assert.equal(isValidAddress(bech32.encode('bc',[1,...bech32.toWords(new Uint8Array(32))]),'bitcoin'),false)
  assert.equal(isValidAddress(bech32m.encode('bc',[0,...bech32m.toWords(new Uint8Array(20))]),'bitcoin'),false)
})
test('exact amounts, invalid units and absent dates', () => {
  assert.equal(formatUnits('1000000000000000001',18),'1.000000000000000001')
  assert.equal(formatUnits('1',8),'0.00000001')
  assert.equal(formatUnits('invalid',18),null)
  assert.equal(formatUnits('1',255),null)
  assert.equal(formatTimestamp(null),'Time unavailable')
  assert.equal(explorerLink('stacks','0x'+hash,'tx'),`https://explorer.hiro.so/txid/0x${hash}?chain=mainnet`)
  assert.equal(explorerLink('ethereum','javascript:alert(1)'),null)
  assert.notEqual(walletKey(btc,'bitcoin'),walletKey(btc.toLowerCase(),'bitcoin'))
})
for (const status of ['unsupported','unavailable','partial']) test(`no false-safe on ${status}`, () => {
  assert.equal(evaluateRisk({status,signals:[]}, {balance:'1 BTC'}).riskScore,null)
  assert.equal(evaluateRisk({status,signals:[]},null).riskLabel,'Insufficient data')
})
test('strongest signal, duplicates and positive history cannot dilute serious evidence', () => {
  const signals = ['phishing_activities','phishing_activities','gas_abuse'].map(id=>({id}))
  const report = evaluateRisk({status:'partial',signals},{totalTransactions:1000000})
  assert.equal(report.riskScore,90)
  assert.equal(report.signals.length,2)
  assert.equal(report.riskLabel,'High risk')
  assert.equal(evaluateRisk({status:'available',signals:[{id:'mixer'}]},null).riskScore,0)
  assert.equal(evaluateRisk({status:'available',signals:[]},null).riskLabel,'Low observed risk')
  assert.equal(evaluateRisk({status:'available',signals:[{id:'blacklist_doubt'}]},null).riskLabel,'Caution')
})
test('GoPlus validates response codes, missing fields and negative coverage', async () => {
  globalThis.fetch = async () => Response.json({code:1,result:{}})
  assert.equal((await goplusCheck(eth,'ethereum')).status,'partial')
  globalThis.fetch = async () => Response.json({code:402,result:{malicious_address:'1'}})
  assert.equal((await goplusCheck(eth,'ethereum')).status,'unavailable')
  globalThis.fetch = async () => Response.json({code:1,result:Object.fromEntries(Object.keys(SIGNALS).map(key=>[key,'0']))})
  assert.equal((await goplusCheck(eth,'bnb')).status,'available')
  assert.equal((await goplusCheck(stx,'stacks')).status,'unsupported')
})
test('provider failure is explicit and uses a timeout', async () => {
  globalThis.fetch = async (url, options) => { assert.ok(options.signal); throw new Error('offline') }
  assert.equal((await goplusCheck(eth,'ethereum')).status,'unavailable')
  await assert.rejects(getWalletData(btc,'bitcoin'))
  await assert.rejects(fetchJSON('https://example.com'))
})
test('missing Etherscan key and malformed RPC never become zero balance', async () => {
  const key = process.env.ETHERSCAN_API_KEY
  delete process.env.ETHERSCAN_API_KEY
  try { await assert.rejects(getWalletData(eth,'ethereum')) } finally { if (key) process.env.ETHERSCAN_API_KEY = key }
  globalThis.fetch = async () => Response.json({error:{message:'rate limited'}})
  await assert.rejects(getWalletData('11111111111111111111111111111111','solana'))
})
test('history provider errors are not an empty successful history', async () => {
  globalThis.fetch = async () => new Response('offline',{status:503})
  await assert.rejects(getRecentTransactions(btc,'bitcoin'))
})
test('EVM pending, failed, unknown and token decimals', () => {
  const tx = {hash:'0x'+hash,value:'1000001',tokenDecimal:'6',confirmations:'5'}
  assert.equal(parseEvmTransaction(tx,'ethereum',true).amount,'1.000001')
  assert.equal(parseEvmTransaction({...tx,confirmations:'0'},'ethereum').status,'Pending')
  assert.equal(parseEvmTransaction({...tx,isError:'1'},'ethereum').status,'Failed')
  assert.equal(parseEvmTransaction(tx,'ethereum').status,'Unknown')
  assert.equal(parseEvmTransaction(tx,'ethereum').timestamp,null)
})
test('BTC all received outputs, case sensitivity, no invented unconfirmed time', () => {
  const tx = {txid:hash,vin:[],vout:[{scriptpubkey_address:btc,value:100},{scriptpubkey_address:btc,value:200}],status:{confirmed:false}}
  const parsed = parseBitcoinTransaction(tx,btc)
  assert.equal(parsed.amount,'0.000003')
  assert.equal(parsed.timestamp,null)
  assert.equal(parsed.status,'Unconfirmed')
  assert.equal(parsed.from,null)
})
test('Stacks pending and contract calls do not invent transfers', () => {
  const tx = parseStacksTransaction({tx_id:'0x'+hash,tx_status:'pending',tx_type:'contract_call'})
  assert.equal(tx.status,'Pending'); assert.equal(tx.amount,null); assert.equal(tx.timestamp,null)
})
test('Solana missing and unchecked amounts remain unknown', () => {
  const sig = {signature:'1'.repeat(88),confirmationStatus:'confirmed',blockTime:null,err:null}
  assert.equal(parseSolanaTransaction(sig,null).amount,null)
  const tx = {transaction:{message:{instructions:[{program:'spl-token',parsed:{type:'transfer',info:{amount:'1000000'}}}]}}}
  assert.equal(parseSolanaTransaction(sig,tx).amount,null)
  assert.equal(parseSolanaTransaction({...sig,err:{}},null).status,'Failed')
})
test('cache deduplicates concurrency and expires', async () => {
  const cache = createCache(10)
  let calls = 0
  const fn = async () => { calls++; return {ok:true} }
  await Promise.all([cache.run('key',fn),cache.run('key',fn)])
  assert.equal(calls,1)
  await new Promise(resolve=>setTimeout(resolve,20))
  await cache.run('key',fn)
  assert.equal(calls,2)
  await assert.rejects(cache.run('failed',()=>{throw new Error('offline')}))
  assert.equal(cache.get('failed'),null)
})
test('strict payload types, optional amounts and path injection', () => {
  assert.ok(validateScan({wallet:eth,chain:'ethereum',amount:'0.5',token:'USDC'}))
  for (const amount of [-1,'-1','Infinity','1e9','0',{},'1.'.repeat(40)]) assert.equal(validateScan({wallet:eth,chain:'ethereum',amount}),null)
  for (const wallet of [null,{},'../../etc/passwd',eth+'?apikey=bad']) assert.equal(validateScan({wallet,chain:'ethereum'}),null)
})
test('registry interface and finality are verified without writing', () => {
  assert.equal(verifyRegistryInterface({functions:[]}),false)
  const tx = {tx_id:'0x'+hash,tx_type:'contract_call',contract_call:{contract_id:CONTRACT,function_name:'log-scan'},tx_status:'success',canonical:true,is_unanchored:false,block_height:100}
  assert.equal(verifyRegistryTransaction(tx).verified,true)
  assert.equal(verifyRegistryTransaction({...tx,tx_status:'pending'}).verified,false)
  assert.equal(verifyRegistryTransaction({...tx,canonical:false}).verified,false)
  assert.equal(verifyRegistryTransaction({...tx,contract_call:{contract_id:'other'}}).verified,false)
})
