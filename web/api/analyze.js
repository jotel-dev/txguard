import { guard, validateScan } from '../server/http.js'
import { scanRecipient } from '../server/scan.js'

export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return
  const input = validateScan(req.body)
  if (!input) return res.status(400).json({ error: 'Enter a valid mainnet address for the selected network and a valid optional amount.' })
  try {
    const report = await scanRecipient(input.wallet, input.chain)
    return res.status(200).json({ ...report, transferContext: { token: input.token || null, amount: input.amount || null, note: 'Optional context only; token ownership, balances and execution are not simulated.' } })
  } catch { return res.status(503).json({ error: 'Scan service is busy. Please try again.' }) }
}
