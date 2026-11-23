import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { bnbNativeBalance, evmTokenBalance } from '../server/evm-rpc.js'
const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})
const address = (n) => `0x${n.toString(16).padStart(40, '0')}`
const hex = (n) => `0x${BigInt(n).toString(16).padStart(64, '0')}`
test('BNB fallback checks the network and preserves native precision', async () => {
  globalThis.fetch = async (_url, options) => {
    const input = JSON.parse(options.body)
    return Response.json({
      jsonrpc: '2.0',
      id: 1,
      result: input.method === 'eth_chainId' ? '0x38' : '0xde0b6b3a7640001',
    })
  }
  assert.equal(await bnbNativeBalance(address(1)), '1.000000000000000001')
})
test('token balance reads onchain decimals and exact uint256 via fixed RPC URLs', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://ethereum-rpc.publicnode.com')
    const input = JSON.parse(options.body)
    const result =
      input.method === 'eth_chainId'
        ? '0x1'
        : input.params[0].data === '0x313ce567'
          ? hex(6)
          : hex(1000001)
    return Response.json({ jsonrpc: '2.0', id: 1, result })
  }
  const result = await evmTokenBalance(address(2), 'ethereum', address(3))
  assert.equal(result.balance, '1.000001')
  assert.equal(result.decimals, 6)
})
test('wrong networks, missing decimals, provider failures and invalid token inputs remain unavailable', async () => {
  globalThis.fetch = async () => Response.json({ jsonrpc: '2.0', id: 1, result: '0x1' })
  await assert.rejects(bnbNativeBalance(address(4)))
  await assert.rejects(evmTokenBalance(address(4), 'ethereum', address(5)))
  await assert.rejects(evmTokenBalance(address(4), 'ethereum', 'https://localhost'))
  globalThis.fetch = async () => {
    throw Error('offline')
  }
  await assert.rejects(bnbNativeBalance(address(6)))
})
