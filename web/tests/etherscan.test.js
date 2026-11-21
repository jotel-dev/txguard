import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readEtherscan, ExplorerError, explorerFailure } from '../server/etherscan.js'
import { getWalletData, parseEvmTransaction } from '../src/blockchain.js'
const fetchOriginal = globalThis.fetch
const keyOriginal = process.env.ETHERSCAN_API_KEY
afterEach(() => {
  globalThis.fetch = fetchOriginal
  if (keyOriginal) process.env.ETHERSCAN_API_KEY = keyOriginal
  else delete process.env.ETHERSCAN_API_KEY
})
const address = (n) => '0x' + n.toString(16).padStart(40, '0')
test('Etherscan credentials are optional and missing access is explicit before fetch', async () => {
  delete process.env.ETHERSCAN_API_KEY
  globalThis.fetch = async () => {
    throw Error('Should not fetch')
  }
  await assert.rejects(
    readEtherscan(address(1), 'ethereum', 'balance'),
    (e) => e instanceof ExplorerError && e.code === 'NOT_CONFIGURED',
  )
  assert.equal(explorerFailure({ code: 'NOT_CONFIGURED' }), 'Explorer activity is not configured.')
})
test('V2 chain IDs, native decimals and deduplicated calls are exact', async () => {
  process.env.ETHERSCAN_API_KEY = 'test-explorer-key'
  const calls = []
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url)
    calls.push(parsed)
    assert.equal(parsed.origin, 'https://api.etherscan.io')
    assert.equal(parsed.pathname, '/v2/api')
    assert.equal(parsed.searchParams.get('apikey'), 'test-explorer-key')
    assert.ok(options.signal)
    return Response.json({ status: '1', result: '1000000000000000001' })
  }
  const [a, b] = await Promise.all([
    getWalletData(address(2), 'ethereum'),
    getWalletData(address(2), 'ethereum'),
  ])
  assert.equal(a.balance, '1.000000000000000001 ETH')
  assert.equal(b.balance, a.balance)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].searchParams.get('chainid'), '1')
  assert.equal((await getWalletData(address(2), 'bnb')).balance, '1.000000000000000001 BNB')
  assert.equal(calls[1].searchParams.get('chainid'), '56')
})
test('only an explicit empty history succeeds; invalid API keys and malformed balances fail', async () => {
  process.env.ETHERSCAN_API_KEY = 'test-explorer-key'
  globalThis.fetch = async () =>
    Response.json({ status: '0', message: 'No transactions found', result: [] })
  assert.deepEqual(await readEtherscan(address(3), 'ethereum', 'txlist'), [])
  globalThis.fetch = async () =>
    Response.json({ status: '0', message: 'NOTOK', result: 'Invalid API Key: SECRET_SENTINEL' })
  await assert.rejects(
    readEtherscan(address(4), 'ethereum', 'balance'),
    (e) => e.code === 'INVALID_CREDENTIALS' && !e.message.includes('SECRET_SENTINEL'),
  )
  globalThis.fetch = async () => Response.json({ status: '1', result: 0 })
  await assert.rejects(
    readEtherscan(address(5), 'ethereum', 'balance'),
    (e) => e.code === 'INVALID_RESPONSE',
  )
})
test('plan restrictions remain unavailable instead of fake zero balances', async () => {
  process.env.ETHERSCAN_API_KEY = 'test-explorer-key'
  globalThis.fetch = async () =>
    Response.json({
      status: '0',
      result: 'Free API access is not supported for this chain. Please upgrade your api plan.',
    })
  await assert.rejects(
    readEtherscan(address(6), 'bnb', 'balance'),
    (e) => e.code === 'PLAN_UNSUPPORTED',
  )
})
test('unsupported chains/actions cannot silently become Ethereum requests', async () => {
  await assert.rejects(
    readEtherscan(address(7), 'solana', 'balance'),
    (e) => e.code === 'UNSUPPORTED_REQUEST',
  )
  await assert.rejects(
    readEtherscan(address(7), 'ethereum', 'arbitrary'),
    (e) => e.code === 'UNSUPPORTED_REQUEST',
  )
})
test('unknown token decimals are not treated as zero and malformed amount stays unknown', () => {
  const tx = { hash: '0x' + 'a'.repeat(64), value: '1000000', tokenDecimal: '' }
  assert.equal(parseEvmTransaction(tx, 'ethereum', true).amount, null)
  assert.equal(parseEvmTransaction({ ...tx, tokenDecimal: '6' }, 'bnb', true).amount, '1')
})
test('HTTP 429 and Etherscan NOTOK rate limits create bounded cooldowns without retries', async () => {
  process.env.ETHERSCAN_API_KEY = 'test-explorer-key'
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return new Response('', { status: 429, headers: { 'Retry-After': '2' } })
  }
  await assert.rejects(
    readEtherscan(address(8), 'ethereum', 'balance'),
    (e) => e.code === 'RATE_LIMITED' && e.retryAfter === 2,
  )
  await assert.rejects(
    readEtherscan(address(9), 'ethereum', 'balance'),
    (e) => e.code === 'RATE_LIMITED',
  )
  assert.equal(calls, 1)
  globalThis.fetch = async () => Response.json({ status: '0', result: 'Max rate limit reached' })
  await assert.rejects(
    readEtherscan(address(10), 'bnb', 'balance'),
    (e) => e.code === 'RATE_LIMITED' && e.retryAfter === 5,
  )
})
