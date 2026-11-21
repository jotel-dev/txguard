import { guard, validateScan } from '../server/http.js'
import { getRecentTransactions } from '../src/blockchain.js'
import { ExplorerError, explorerFailure } from '../server/etherscan.js'
export default async function handler(req, res) {
  if (!(await guard(req, res, 'GET', 'history'))) return
  const input = validateScan(req.query)
  if (!input) return res.status(400).json({ error: 'Enter a valid mainnet address and network.' })
  try {
    const data = await getRecentTransactions(input.wallet, input.chain)
    return res.status(200).json({ ...data, fetchedAt: new Date().toISOString(), mode: 'live' })
  } catch (error) {
    if (error instanceof ExplorerError) {
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter))
      return res
        .status(error.code === 'RATE_LIMITED' ? 429 : 503)
        .json({ error: explorerFailure(error), code: error.code })
    }
    return res
      .status(503)
      .json({ error: 'Transaction provider unavailable. Retry shortly or use the explorer.' })
  }
}
