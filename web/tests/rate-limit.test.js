import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter, RATE_SCRIPT } from '../server/rate-limit.js'

const env = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
  RATE_LIMIT_HMAC_SECRET: 'test-hmac-secret-at-least-32-characters',
}
const req = (ip = '203.0.113.9') => ({
  headers: { 'x-real-ip': ip },
  socket: { remoteAddress: '127.0.0.1' },
})
function sharedStore() {
  const counters = new Map()
  let time = 0
  const requests = []
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://example.upstash.io')
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal)
    assert.equal(options.headers.Authorization, 'Bearer test-redis-token')
    const command = JSON.parse(options.body)
    requests.push(command)
    assert.equal(command[0], 'EVAL')
    assert.equal(command[1], RATE_SCRIPT)
    const n = command[2],
      keys = command.slice(3, 3 + n),
      limits = command.slice(3 + n, 3 + 2 * n),
      window = command.at(-1)
    // Mock the shared server's single atomic EVAL operation, not separate client GET/INCR calls.
    const values = keys.map((key) => {
      const existing = counters.get(key)
      return existing?.until > time ? existing : { count: 0, until: time + window }
    })
    const blocked = values.filter((value, i) => value.count >= limits[i])
    if (blocked.length)
      return Response.json({ result: [0, 0, Math.max(...blocked.map((v) => v.until - time))] })
    values.forEach((value, i) => {
      value.count++
      counters.set(keys[i], value)
    })
    return Response.json({
      result: [
        1,
        Math.min(...values.map((v, i) => limits[i] - v.count)),
        Math.max(...values.map((v) => v.until - time)),
      ],
    })
  }
  return {
    fetchImpl,
    requests,
    advance: (ms) => {
      time += ms
    },
  }
}

test('separate serverless limiter instances share one atomic client quota under concurrency', async () => {
  const store = sharedStore()
  const instances = [
    createRateLimiter({ env, fetchImpl: store.fetchImpl }),
    createRateLimiter({ env, fetchImpl: store.fetchImpl }),
  ]
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => instances[i % 2].consume(req(), 'scan')),
  )
  assert.equal(results.filter((r) => r.allowed).length, 20)
  assert.equal(results.filter((r) => !r.allowed && !r.unavailable).length, 30)
  assert.equal(results.at(-1).retryAfter, 60)
  assert.ok(store.requests.every((command) => !JSON.stringify(command).includes('203.0.113.9')))
  assert.match(store.requests[0][3], /:scan:[a-f0-9]{64}$/)
  assert.ok(store.requests[0].slice(3, 6).every((key) => key.includes('{rate-production}')))
})
test('window expiry and independent endpoint quotas are honored', async () => {
  const store = sharedStore(),
    limiter = createRateLimiter({ env, fetchImpl: store.fetchImpl })
  for (let i = 0; i < 8; i++) assert.equal((await limiter.consume(req(), 'ask')).allowed, true)
  assert.equal((await limiter.consume(req(), 'ask')).allowed, false)
  assert.equal((await limiter.consume(req(), 'scan')).allowed, true)
  store.advance(60001)
  assert.equal((await limiter.consume(req(), 'ask')).allowed, true)
})
test('shared AI ceiling and all-route ceiling constrain multiple clients', async () => {
  const store = sharedStore(),
    limiter = createRateLimiter({
      env: { ...env, RATE_LIMIT_AI_GLOBAL_PER_MINUTE: '2', RATE_LIMIT_GLOBAL_PER_MINUTE: '3' },
      fetchImpl: store.fetchImpl,
    })
  assert.equal((await limiter.consume(req('203.0.113.1'), 'ask')).allowed, true)
  assert.equal((await limiter.consume(req('203.0.113.2'), 'ask')).allowed, true)
  assert.equal((await limiter.consume(req('203.0.113.3'), 'ask')).allowed, false)
  assert.equal((await limiter.consume(req('203.0.113.4'), 'scan')).allowed, true)
  assert.equal((await limiter.consume(req('203.0.113.5'), 'history')).allowed, false)
})
test('production missing credentials or HMAC secret fails closed without calling providers', async () => {
  let calls = 0
  for (const settings of [
    { VERCEL: '1' },
    { NODE_ENV: 'production' },
    { ...env, UPSTASH_REDIS_REST_TOKEN: '' },
    { ...env, RATE_LIMIT_HMAC_SECRET: 'short' },
    { ...env, RATE_LIMIT_GLOBAL_PER_MINUTE: 'NaN' },
  ]) {
    const result = await createRateLimiter({
      env: settings,
      fetchImpl: async () => {
        calls++
        throw Error('must not call')
      },
    }).consume(req(), 'scan')
    assert.equal(result.unavailable, true)
    assert.equal(result.allowed, false)
  }
  assert.equal(calls, 0)
})
test('storage errors, timeouts and malformed responses never fall back to memory', async () => {
  for (const fn of [
    async () => {
      throw Error('secret upstream failure')
    },
    async () => new Response('bad', { status: 401 }),
    async () => Response.json({ error: 'bad credentials' }),
    async () => Response.json({ result: [1, 0, -1] }),
    async () => Response.json({ result: [9, 0, 1] }),
    async () => Response.json({ result: [1, -5, 60000] }),
  ]) {
    const result = await createRateLimiter({ env, fetchImpl: fn }).consume(req(), 'scan')
    assert.deepEqual(result, { allowed: false, unavailable: true, retryAfter: 30 })
    assert.ok(!JSON.stringify(result).includes('secret'))
  }
})
test('Redis URL validation rejects credentials, redirect paths and private hosts before fetch', async () => {
  let calls = 0
  for (const url of [
    'http://example.upstash.io',
    'https://127.0.0.1',
    'https://example.upstash.io/forward',
    'https://evil.upstash.io.example.com',
    'https://user:password@example.upstash.io',
  ]) {
    const result = await createRateLimiter({
      env: { ...env, UPSTASH_REDIS_REST_URL: url },
      fetchImpl: async () => {
        calls++
      },
    }).consume(req(), 'scan')
    assert.equal(result.unavailable, true)
  }
  assert.equal(calls, 0)
})
test('development-only memory quota ignores spoofed forwarding headers', async () => {
  const limiter = createRateLimiter({ env: {} })
  for (let i = 0; i < 20; i++)
    assert.equal((await limiter.consume(req(`203.0.113.${i}`), 'scan')).allowed, true)
  assert.equal((await limiter.consume(req('203.0.113.99'), 'scan')).allowed, false)
})
