import { fetchJSON } from '../server/http.js'

// Evidence policy v2. The strongest distinct reported signal determines the score.
// These severity points are an explainable policy, not a calibrated probability of fraud.
export const SIGNALS = {
  phishing_activities: { score: 90, title: 'Phishing activity report' },
  stealing_attack: { score: 90, title: 'Stealing attack report' },
  blackmail_activities: { score: 90, title: 'Blackmail activity report' },
  cybercrime: { score: 85, title: 'Cybercrime association report' },
  money_laundering: { score: 80, title: 'Money laundering association report' },
  financial_crime: { score: 80, title: 'Financial crime association report' },
  sanctioned: { score: 95, title: 'Sanctions indicator (provider report)' },
  fake_kyc: { score: 60, title: 'Fake identity verification report' },
  malicious_mining_activities: { score: 60, title: 'Malicious mining activity report' },
  darkweb_transactions: { score: 40, title: 'Darkweb activity association (unconfirmed)' },
  fake_standard_interface: { score: 60, title: 'Nonstandard contract interface report' },
  reinit: { score: 30, title: 'Redeployable contract indicator' },
  honeypot_related_address: { score: 65, title: 'Honeypot-related address report' },
  fake_token: { score: 60, title: 'Fake token association report' },
  blacklist_doubt: { score: 40, title: 'Blacklist suspicion report (unconfirmed)' },
  gas_abuse: { score: 30, title: 'Gas abuse report' },
  mixer: { score: 0, title: 'Mixer association (context only; not evidence of fraud)' },
}

export async function goplusCheck(address, chain) {
  if (!['ethereum', 'bnb'].includes(chain)) return { status: 'unsupported', source: 'GoPlus address security', signals: [], note: 'Address-security intelligence is not integrated for this network.' }
  try {
    const data = await fetchJSON(`https://api.gopluslabs.io/api/v1/address_security/${encodeURIComponent(address)}?chain_id=${chain === 'bnb' ? '56' : '1'}`, { headers: { accept: 'application/json' } })
    const result = data.result
    // Empty result, provider errors, or a partial set of negative fields cannot establish clean coverage.
    if (data.code !== 1 || !result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid intelligence response')
    const fields = Object.keys(SIGNALS)
    const signals = fields.filter(key => result[key] === '1').map(key => ({ id: key, ...SIGNALS[key], source: 'GoPlus address security', evidence: key === 'blacklist_doubt' || key === 'mixer' ? 'provider context' : 'provider report' }))
    const complete = fields.every(key => result[key] === '0' || result[key] === '1')
    return { status: complete ? 'available' : 'partial', source: 'GoPlus address security', signals, note: complete ? 'Available address-security fields retrieved; database coverage is not comprehensive.' : 'Provider omitted some address-security fields.' }
  } catch {
    return { status: 'unavailable', source: 'GoPlus address security', signals: [], note: 'Security provider unavailable. No clean result can be inferred.' }
  }
}

export function evaluateRisk(security, onchainData) {
  const signals = [...new Map((security?.signals || []).filter(s => Object.hasOwn(SIGNALS, s.id)).map(s => [s.id, { ...s, ...SIGNALS[s.id] }])).values()]
  const strongest = signals.reduce((max, s) => Math.max(max, s.score), 0)
  const sufficient = security?.status === 'available' || strongest > 0
  const riskScore = sufficient ? strongest : null
  const riskLabel = riskScore === null ? 'Insufficient data' : riskScore >= 76 ? 'High risk' : riskScore >= 51 ? 'Suspicious' : riskScore >= 26 ? 'Caution' : 'Low observed risk'
  const alerts = signals.map(s => ({ type: s.score >= 76 ? 'danger' : s.score > 0 ? 'warn' : 'info', title: s.title, text: s.id === 'gas_abuse' ? 'GoPlus reports gas abuse. This is not an approval audit.' : `${s.source || 'GoPlus'} supplied this indicator. Reports may be incomplete or incorrect; review the evidence independently.`, evidence: s.evidence || 'provider report' }))
  if (!sufficient) alerts.push({ type: 'info', title: 'Insufficient security coverage', text: security?.note || 'No address-security intelligence is available.', evidence: 'coverage limitation' })
  if (sufficient && strongest === 0) alerts.push({ type: 'info', title: 'No scored indicators returned', text: 'No scored indicators appeared in the retrieved fields. This is not a guarantee of safety.', evidence: 'provider response' })
  if (!onchainData) alerts.push({ type: 'info', title: 'Blockchain activity unavailable', text: 'Balance and activity could not be verified.', evidence: 'coverage limitation' })
  return { riskScore, riskLabel, alerts, signals, policy: 'txguard-evidence-v2', confidence: sufficient ? 'Limited to retrieved provider evidence' : 'Insufficient coverage', summary: riskScore === null ? 'There is not enough security intelligence to assess this recipient. A valid address or an available balance does not establish trust.' : strongest > 0 ? `${riskLabel}: the security provider returned ${signals.filter(s => s.score > 0).length} scored indicator(s). Verify the recipient independently before proceeding.` : 'No high-severity indicators were returned in the available address-security fields. Unknown threats, ownership, token approvals and execution outcomes remain unchecked.', recommendations: ['Verify the full address and network with your recipient through a trusted channel.', 'Do not share a seed phrase or private key. Independently inspect unexpected payment instructions.', 'Review coverage limits and explorer history. A small test transfer can still lose funds.'] }
}

export async function calculateRisk(address, chain, onchainData) {
  return evaluateRisk(await goplusCheck(address, chain), onchainData)
}
