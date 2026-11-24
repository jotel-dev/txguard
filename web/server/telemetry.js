// Warm-instance aggregates only. No wallet, IP, URL, prompt, credentials or provider body.
const services = new Map()
const ALLOWED = new Set([
  'api.etherscan.io',
  'api.gopluslabs.io',
  'api.mainnet-beta.solana.com',
  'blockstream.info',
  'api.hiro.so',
  'api.groq.com',
  'ethereum-rpc.publicnode.com',
  'bsc-dataseed.bnbchain.org',
])
export function recordProvider(url, started, ok) {
  const host = new URL(url).hostname
  if (!ALLOWED.has(host)) return
  const previous = services.get(host) || { requests: 0, failures: 0, totalMs: 0 }
  const durationMs = Math.max(0, Math.round(performance.now() - started))
  services.set(host, {
    requests: previous.requests + 1,
    failures: previous.failures + (ok ? 0 : 1),
    totalMs: previous.totalMs + durationMs,
  })
  if (!ok) console.warn(JSON.stringify({ event: 'provider_failure', service: host, durationMs }))
}
export function operationalSnapshot() {
  return [...services].map(([service, value]) => ({ service, ...value }))
}
