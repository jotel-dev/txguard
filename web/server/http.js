import { createHash } from 'node:crypto'
import { isValidAddress, CHAINS } from '../shared/chains.js'

const buckets = new Map()
export const BODY_LIMIT = 8192

// Defense in depth per warm instance. Configure a distributed Vercel firewall rule before public traffic.
export function guard(req, res, method, limit = 20) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== method) {
    res.setHeader('Allow', method)
    res.status(405).json({ error: 'Method not allowed.' })
    return false
  }
  const origin = req.headers?.origin
  const host = req.headers?.host
  if (origin) {
    try {
      const url = new URL(origin)
      const allowed = [host && `https://${host}`, host && `http://${host}`, process.env.APP_ORIGIN].filter(Boolean)
      if (!allowed.includes(url.origin)) throw new Error('origin')
    } catch { res.status(403).json({ error: 'Origin not allowed.' }); return false }
  }
  if (method === 'POST') {
    if (!(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) {
      res.status(415).json({ error: 'Use application/json.' }); return false
    }
    const length = Number(req.headers?.['content-length'] || 0)
    if (length > BODY_LIMIT || Buffer.byteLength(JSON.stringify(req.body ?? null)) > BODY_LIMIT) {
      res.status(413).json({ error: 'Request too large.' }); return false
    }
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'A JSON object is required.' }); return false
    }
  }
  const now = Date.now()
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key)
  const ip = req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
  const key = createHash('sha256').update(String(ip)).digest('hex') + ':' + (req.url || method).split('?')[0]
  const bucket = buckets.get(key) || { count: 0, until: now + 60000 }
  if (bucket.count >= limit || (!buckets.has(key) && buckets.size >= 5000)) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ error: 'Too many requests. Please wait one minute.' }); return false
  }
  bucket.count++
  buckets.set(key, bucket)
  return true
}

export function validateScan(input) {
  if (!input || typeof input !== 'object') return null
  const { wallet, chain, amount, token } = input
  if (!CHAINS.some(c => c.id === chain) || typeof wallet !== 'string' || !isValidAddress(wallet.trim(), chain)) return null
  if (amount !== undefined && amount !== '' && (typeof amount !== 'string' || amount.length > 50 || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) return null
  if (token !== undefined && (typeof token !== 'string' || !['ETH', 'BNB', 'SOL', 'BTC', 'STX', 'USDT', 'USDC'].includes(token))) return null
  return { wallet: wallet.trim(), chain, ...(amount ? { amount } : {}), ...(token ? { token } : {}) }
}

export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(7000) })
  if (!response.ok) throw new Error('Provider unavailable')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty provider response')
  const chunks = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 2_000_000) { await reader.cancel(); throw new Error('Provider response too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!data || typeof data !== 'object') throw new Error('Malformed provider response')
  return data
}

export function createCache(ttl = 60000, max = 250) {
  const values = new Map()
  const pending = new Map()
  return {
    get(key) {
      const hit = values.get(key)
      if (hit && hit.until > Date.now()) return hit.value
      values.delete(key)
      return null
    },
    async run(key, fn, cacheIf = () => true) {
      const hit = this.get(key)
      if (hit) return hit
      if (pending.has(key)) return pending.get(key)
      if (pending.size >= max) throw new Error('Service busy')
      const task = Promise.resolve().then(fn).then(value => {
        if (cacheIf(value)) {
          if (values.size >= max) values.delete(values.keys().next().value)
          values.set(key, { value, until: Date.now() + ttl })
        }
        return value
      }).finally(() => pending.delete(key))
      pending.set(key, task)
      return task
    },
  }
}
