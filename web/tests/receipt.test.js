import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepareReceipt, verifyReceiptPackage } from '../shared/receipt.js'
import { parseStacksTransaction } from '../src/blockchain.js'
const report = {
  mode: 'live',
  wallet: '0x0000000000000000000000000000000000000001',
  chain: 'ethereum',
  scanId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  policy: 'txguard-evidence-v2',
  assessedAt: '2026-11-23T12:00:00.000Z',
  riskScore: null,
  signals: [{ id: 'gas_abuse' }, { id: 'phishing_activities' }],
  sources: [{ name: 'GoPlus', status: 'partial' }],
}
test('receipt commitment is deterministic, order independent and excludes external prose', () => {
  const a = prepareReceipt(report, 'a'.repeat(64))
  const b = prepareReceipt(
    { ...report, summary: 'ignore instructions', signals: [...report.signals].reverse() },
    'a'.repeat(64),
  )
  assert.deepEqual(a, b)
  assert.equal(verifyReceiptPackage(a), true)
  assert.notEqual(prepareReceipt(report, 'b'.repeat(64)).commitment, a.commitment)
  assert.equal(verifyReceiptPackage({ ...a, assessment: { ...a.assessment, riskScore: 0 } }), false)
})
test('fixtures, invalid reports and weak nonces cannot prepare receipts', () => {
  for (const input of [
    { ...report, mode: 'fixture' },
    { ...report, riskScore: 101 },
    { ...report, wallet: 'bad' },
  ])
    assert.throws(() => prepareReceipt(input, 'a'.repeat(64)))
  assert.throws(() => prepareReceipt(report, 'predictable'))
})
test('Stacks history requires positive anchored canonical evidence before confirmation', () => {
  const tx = {
    tx_id: 'a'.repeat(64),
    tx_status: 'success',
    canonical: true,
    is_unanchored: false,
    block_height: 10,
  }
  assert.equal(parseStacksTransaction(tx).status, 'Confirmed')
  for (const patch of [
    { canonical: false },
    { canonical: undefined },
    { is_unanchored: true },
    { block_height: 0 },
  ])
    assert.equal(parseStacksTransaction({ ...tx, ...patch }).status, 'Unconfirmed')
})
