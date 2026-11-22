import { createHmac, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'

export const RATE_PROFILES = Object.freeze({
  scan: { limit: 20, shared: 300 },
  history: { limit: 30, shared: 300 },
  ask: { limit: 8, shared: 30 },
  registry: { limit: 20, shared: 300 },
  tts: { limit: 10, shared: 60 },
  'report-bug': { limit: 5, shared: 60 },
})
const WINDOW_MS = 60000
// One atomic decision for client, endpoint and application-wide quotas. No partial increments.
export const RATE_SCRIPT = `
local retry = 0
for i = 1, #KEYS do
  local count = tonumber(redis.call('GET', KEYS[i]) or '0')
  if count >= tonumber(ARGV[i]) then
    local ttl = redis.call('PTTL', KEYS[i])
    if ttl < 1 then ttl = tonumber(ARGV[#KEYS + 1]) end
    retry = math.max(retry, ttl)
  end
end
if retry > 0 then return {0, 0, retry} end
local remaining = 2147483647
local reset = 0
for i = 1, #KEYS do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('PEXPIRE', KEYS[i], ARGV[#KEYS + 1]) end
  remaining = math.min(remaining, tonumber(ARGV[i]) - count)
  reset = math.max(reset, redis.call('PTTL', KEYS[i]))
end
return {1, remaining, reset}
`

function clientIP(req, env) {
  // Vercel overwrites these headers. Outside that platform, only trust the TCP peer.
  const candidate =
    env.VERCEL === '1'
      ? req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-real-ip']
      : req.socket?.remoteAddress
  if (typeof candidate !== 'string' || !isIP(candidate.trim())) return 'unknown'
  const ip = candidate.trim()
  return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) throw new Error('Invalid quota')
  return parsed
}

export function createRateLimiter({
  env = process.env,
  fetchImpl = (...args) => fetch(...args),
  now = Date.now,
} = {}) {
  const local = new Map()
  const localSecret = randomBytes(32).toString('hex')
  return {
    async consume(req, scope) {
      try {
        const profile = RATE_PROFILES[scope]
        if (!profile) throw new Error('Unknown quota')
        const production = env.VERCEL === '1' || env.NODE_ENV === 'production'
        const primary = !!(env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN)
        const urlValue = primary ? env.UPSTASH_REDIS_REST_URL : env.KV_REST_API_URL
        const token = primary ? env.UPSTASH_REDIS_REST_TOKEN : env.KV_REST_API_TOKEN
        const configured = !!(urlValue || token)
        const secret = env.RATE_LIMIT_HMAC_SECRET
        if ((production || configured) && (typeof secret !== 'string' || secret.length < 32))
          throw new Error('Missing privacy secret')
        if (production && !configured) throw new Error('Shared limiter is required')
        const context =
          env.VERCEL_ENV === 'production'
            ? 'production'
            : env.VERCEL === '1'
              ? 'preview'
              : production
                ? 'production'
                : 'development'
        const actor = createHmac('sha256', secret || localSecret)
          .update(clientIP(req, env))
          .digest('hex')
        const prefix = `txguard:{rate-${context}}`
        const keys = [`${prefix}:${scope}:${actor}`, `${prefix}:${scope}:all`, `${prefix}:all`]
        const limits = [
          profile.limit,
          scope === 'ask'
            ? positiveInteger(env.RATE_LIMIT_AI_GLOBAL_PER_MINUTE, profile.shared)
            : profile.shared,
          positiveInteger(env.RATE_LIMIT_GLOBAL_PER_MINUTE, 600),
        ]
        let result
        if (configured) {
          if (!urlValue || !token || typeof token !== 'string')
            throw new Error('Incomplete credentials')
          const endpoint = new URL(urlValue)
          if (
            endpoint.protocol !== 'https:' ||
            !endpoint.hostname.endsWith('.upstash.io') ||
            endpoint.port ||
            endpoint.username ||
            endpoint.password ||
            endpoint.search ||
            endpoint.hash ||
            !['', '/'].includes(endpoint.pathname)
          )
            throw new Error('Invalid Redis endpoint')
          const response = await fetchImpl(endpoint.origin, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(2000),
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(['EVAL', RATE_SCRIPT, keys.length, ...keys, ...limits, WINDOW_MS]),
          })
          if (!response.ok) throw new Error('Shared limiter unavailable')
          const reader = response.body?.getReader()
          if (!reader) throw new Error('Missing limiter response')
          const chunks = []
          let bytes = 0
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              bytes += value.byteLength
              if (bytes > 4096) {
                await reader.cancel()
                throw new Error('Invalid limiter response')
              }
              chunks.push(value)
            }
          } finally {
            reader.releaseLock()
          }
          const text = Buffer.concat(chunks).toString('utf8')
          const data = JSON.parse(text)
          if (data.error) throw new Error('Shared limiter failed')
          result = data.result
        } else {
          const time = now()
          for (const [key, value] of local) if (value.until <= time) local.delete(key)
          const counters = keys.map(
            (key) => local.get(key) || { count: 0, until: time + WINDOW_MS },
          )
          const blocked = counters.filter((counter, i) => counter.count >= limits[i])
          if (blocked.length) result = [0, 0, Math.max(...blocked.map((c) => c.until - time))]
          else if (local.size + keys.filter((key) => !local.has(key)).length > 5000)
            throw new Error('Local limiter busy')
          else {
            counters.forEach((counter, i) => {
              counter.count++
              local.set(keys[i], counter)
            })
            result = [
              1,
              Math.min(...counters.map((counter, i) => limits[i] - counter.count)),
              Math.max(...counters.map((c) => c.until - time)),
            ]
          }
        }
        if (
          !Array.isArray(result) ||
          result.length !== 3 ||
          ![0, 1].includes(result[0]) ||
          !Number.isInteger(result[1]) ||
          result[1] < 0 ||
          !Number.isFinite(result[2]) ||
          result[2] <= 0 ||
          result[2] > WINDOW_MS
        )
          throw new Error('Invalid shared decision')
        return {
          allowed: result[0] === 1,
          unavailable: false,
          limit: profile.limit,
          remaining: result[1],
          retryAfter: Math.max(1, Math.ceil(result[2] / 1000)),
          mode: configured ? 'distributed' : 'local-development',
        }
      } catch {
        // Never silently downgrade to process-local protection when configured storage fails.
        return { allowed: false, unavailable: true, retryAfter: 30 }
      }
    },
  }
}

export const rateLimiter = createRateLimiter()
