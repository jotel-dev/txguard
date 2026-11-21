import { isValidAddress, walletKey } from '../shared/chains.js'

export async function request(url, body, signal) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(27000)]) : AbortSignal.timeout(27000) })
  let data
  try { data = await response.json() } catch { throw new Error('The server returned an unreadable response. Please retry.') }
  if (!response.ok) throw new Error(data.error || 'Service unavailable. Please retry.')
  return data
}
export function loadWallets() {
  try {
    const values = JSON.parse(localStorage.getItem('txguard_tracked_wallets') || '[]')
    if (!Array.isArray(values)) return []
    const keys = new Set()
    return values.filter(w => w && isValidAddress(w.address, w.chain) && !keys.has(walletKey(w.address,w.chain)) && keys.add(walletKey(w.address,w.chain))).slice(0,30).map(w => ({ id: typeof w.id === 'string' ? w.id.slice(0,100) : walletKey(w.address,w.chain), label: typeof w.label === 'string' ? w.label.slice(0,60) : 'Saved wallet', address: w.address, chain: w.chain, assessment: validAssessment(w.assessment) ? w.assessment : null }))
  } catch { return [] }
}
export function validAssessment(value) {
  return !!value && value.policy === 'txguard-evidence-v2' && typeof value.assessedAt === 'string' && Number.isFinite(Date.parse(value.assessedAt)) && (value.riskScore === null || (Number.isInteger(value.riskScore) && value.riskScore >= 0 && value.riskScore <= 100)) && typeof value.riskLabel === 'string' && value.riskLabel.length < 50 && typeof value.balance === 'string' && value.balance.length < 150
}
export function assessmentOf(report) {
  return { policy: report.policy, assessedAt: report.assessedAt, riskScore: report.riskScore, riskLabel: report.riskLabel, balance: report.balance }
}
export function loadHistory() {
  try {
    const values = JSON.parse(localStorage.getItem('txguard_scan_history') || '[]')
    return Array.isArray(values) ? values.filter(item => item && isValidAddress(item.wallet,item.chain) && validAssessment(item)).slice(0,20) : []
  } catch { return [] }
}
export function persist(key, value) {
  try { localStorage.setItem(key,JSON.stringify(value)); return true } catch { return false }
}
