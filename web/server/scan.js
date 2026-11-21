import { randomUUID, createHash } from 'node:crypto'
import { getWalletData } from '../src/blockchain.js'
import { goplusCheck, evaluateRisk } from '../src/riskEngine.js'
import { createCache } from './http.js'
import { walletKey, explorerLink } from '../shared/chains.js'

export const scans = createCache(60000)
const reports = new Map()
export function getReport(id) {
  const record = reports.get(id)
  return record && record.expires > Date.now() ? record.report : null
}
export async function scanRecipient(wallet, chain) {
  return scans.run(
    walletKey(wallet, chain),
    async () => {
      const [activity, security] = await Promise.allSettled([
        getWalletData(wallet, chain),
        goplusCheck(wallet, chain),
      ])
      const onchain = activity.status === 'fulfilled' ? activity.value : null
      const intelligence =
        security.status === 'fulfilled'
          ? security.value
          : { status: 'unavailable', source: 'GoPlus address security', signals: [] }
      const risk = evaluateRisk(intelligence, onchain)
      const report = {
        ...risk,
        scanId: randomUUID(),
        wallet,
        chain,
        assessedAt: new Date().toISOString(),
        mode: 'live',
        assessmentType: 'Recipient risk assessment',
        balance: onchain?.balance ?? 'Unavailable',
        totalTransactions: onchain?.totalTransactions ?? 'Not established',
        walletAge: 'Not established',
        categories: [],
        explorerUrl: explorerLink(chain, wallet),
        sources: [
          { name: intelligence.source, status: intelligence.status, note: intelligence.note },
          {
            name:
              onchain?.source ||
              {
                ethereum: 'Etherscan V2',
                bnb: 'Etherscan V2',
                solana: 'Solana mainnet RPC',
                bitcoin: 'Blockstream',
                stacks: 'Hiro Stacks API',
              }[chain],
            status: onchain ? 'available' : 'unavailable',
          },
        ],
        limitations: [
          'This is an address-only assessment, not a transaction execution simulation.',
          'No ownership verification, approval audit, token honeypot test or complete sanctions screening.',
          'History and balance do not prove absence of fraud. An address can be compromised after this assessment.',
        ],
        explanation: { source: 'deterministic', text: risk.summary },
      }
      // Local evidence commitment, not an onchain receipt or a signature of authenticity.
      report.commitment = createHash('sha256')
        .update(
          JSON.stringify({
            policy: report.policy,
            wallet,
            chain,
            assessedAt: report.assessedAt,
            riskScore: report.riskScore,
            signals: report.signals,
          }),
        )
        .digest('hex')
      const now = Date.now()
      for (const [id, record] of reports) if (record.expires <= now) reports.delete(id)
      if (reports.size >= 500) reports.delete(reports.keys().next().value)
      reports.set(report.scanId, { report, expires: now + 15 * 60000 })
      return report
    },
    (report) => report.sources.some((s) => s.status === 'available' || s.status === 'partial'),
  )
}
