import { guard, validateScan } from '../server/http.js'
import { getRecentTransactions } from '../src/blockchain.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'GET', 30)) return
  const input = validateScan(req.query)
  if (!input) return res.status(400).json({ error: 'Enter a valid mainnet address and network.' })
  try {
    const data = await getRecentTransactions(input.wallet, input.chain)
    return res.status(200).json({ ...data, fetchedAt: new Date().toISOString(), mode: 'live' })
  } catch { return res.status(503).json({ error: 'Transaction provider unavailable. Retry shortly or use the explorer.' }) }
}
