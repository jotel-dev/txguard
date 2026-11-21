import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadWallets, loadHistory, persist } from '../src/client.js'
const original = globalThis.localStorage
afterEach(() => {
  if (original) globalThis.localStorage = original
  else delete globalThis.localStorage
})
const address = '0x52908400098527886E0F7030069857D2E4169EE7'
test('legacy saved addresses survive; unverifiable old balances and scores are cleared', () => {
  globalThis.localStorage = {
    getItem: () =>
      JSON.stringify([
        {
          id: '1',
          chain: 'ethereum',
          address,
          label: 'My wallet',
          balance: '123 ETH',
          riskScore: 0,
          riskLabel: 'Safe',
        },
      ]),
  }
  const [wallet] = loadWallets()
  assert.equal(wallet.address, address)
  assert.equal(wallet.label, 'My wallet')
  assert.equal(wallet.assessment, null)
})
test('corrupt and non-array device storage cannot crash the dashboard', () => {
  for (const value of ['invalid', '{}', 'null', '[null,{}]']) {
    globalThis.localStorage = { getItem: () => value }
    assert.deepEqual(loadWallets(), [])
    assert.deepEqual(loadHistory(), [])
  }
})
test('blocked storage is recoverable and wallet duplicates are removed', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('denied')
    },
  }
  assert.deepEqual(loadWallets(), [])
  assert.equal(persist('key', []), false)
  globalThis.localStorage = {
    getItem: () =>
      JSON.stringify([
        { id: '1', chain: 'ethereum', address },
        { id: '2', chain: 'ethereum', address: address.toLowerCase() },
      ]),
  }
  assert.equal(loadWallets().length, 1)
})
