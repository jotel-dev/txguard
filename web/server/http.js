import { isValidAddress, CHAINS } from '../shared/chains.js'
import { rateLimiter } from './rate-limit.js'

export const BODY_LIMIT = 8192

export async function guard(req, res, method, scope = 'scan') {
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
      const allowed = [
        host && `https://${host}`,
        host && `http://${host}`,
        process.env.APP_ORIGIN,
      ].filter(Boolean)
      if (!allowed.includes(url.origin)) throw new Error('origin')
    } catch {
      res.status(403).json({ error: 'Origin not allowed.' })
      return false
    }
  }
  if (method === 'POST') {
    if (!(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) {
      res.status(415).json({ error: 'Use application/json.' })
      return false
    }
    const length = Number(req.headers?.['content-length'] || 0)
    if (length > BODY_LIMIT || Buffer.byteLength(JSON.stringify(req.body ?? null)) > BODY_LIMIT) {
      res.status(413).json({ error: 'Request too large.' })
      return false
    }
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ error: 'A JSON object is required.' })
      return false
    }
  }
  const decision = await rateLimiter.consume(req, scope)
  if (decision.unavailable) {
    res.setHeader('Retry-After', String(decision.retryAfter))
    res.status(503).json({ error: 'Request protection is unavailable. Please retry shortly.' })
    return false
  }
  res.setHeader('RateLimit-Limit', String(decision.limit))
  res.setHeader('RateLimit-Remaining', String(decision.remaining))
  res.setHeader('RateLimit-Reset', String(decision.retryAfter))
  if (!decision.allowed) {
    res.setHeader('Retry-After', String(decision.retryAfter))
    res.status(429).json({ error: 'Too many requests. Wait before trying again.' })
    return false
  }
  return true
}

export function validateScan(input) {
  if (!input || typeof input !== 'object') return null
  const { wallet, chain, amount, token } = input
  if (
    !CHAINS.some((c) => c.id === chain) ||
    typeof wallet !== 'string' ||
    !isValidAddress(wallet.trim(), chain)
  )
    return null
  if (
    amount !== undefined &&
    amount !== '' &&
    (typeof amount !== 'string' ||
      amount.length > 50 ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0)
  )
    return null
  if (
    token !== undefined &&
    (typeof token !== 'string' ||
      !['ETH', 'BNB', 'SOL', 'BTC', 'STX', 'USDT', 'USDC'].includes(token))
  )
    return null
  return {
    wallet: wallet.trim(),
    chain,
    ...(amount ? { amount } : {}),
    ...(token ? { token } : {}),
  }
}

export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok)
    throw Object.assign(new Error('Provider unavailable'), {
      status: response.status,
      retryAfter: Math.min(60, Math.max(1, Number(response.headers.get('retry-after')) || 5)),
    })
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty provider response')
  const chunks = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 2_000_000) {
        await reader.cancel()
        throw new Error('Provider response too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
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
      const task = Promise.resolve()
        .then(fn)
        .then((value) => {
          if (cacheIf(value)) {
            if (values.size >= max) values.delete(values.keys().next().value)
            values.set(key, { value, until: Date.now() + ttl })
          }
          return value
        })
        .finally(() => pending.delete(key))
      pending.set(key, task)
      return task
    },
  }
}
