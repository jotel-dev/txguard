import { test } from 'node:test'
import assert from 'node:assert/strict'
import { operationalSnapshot } from '../server/telemetry.js'
import { fetchJSON } from '../server/http.js'
import health from '../api/health.js'
test('provider failures log only bounded operational metadata', async () => {
  const original = globalThis.fetch
  const warn = console.warn
  const logs = []
  console.warn = (value) => logs.push(value)
  globalThis.fetch = async () => {
    throw new Error('SECRET wallet private provider error')
  }
  try {
    await assert.rejects(fetchJSON('https://api.hiro.so/wallet/PRIVATE?key=SECRET'))
    assert.equal(logs.length, 1)
    assert.equal(logs[0].includes('SECRET'), false)
    assert.equal(logs[0].includes('PRIVATE'), false)
    assert.equal(operationalSnapshot()[0].failures, 1)
  } finally {
    globalThis.fetch = original
    console.warn = warn
  }
})
test('health checks request protection and reveals no configuration', async () => {
  let body
  const res = {
    setHeader() {},
    status(code) {
      this.code = code
      return this
    },
    json(value) {
      body = value
      return this
    },
  }
  await health({ method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res)
  assert.equal(res.code, 200)
  assert.equal(body.scope, 'api-and-request-protection')
  assert.equal(JSON.stringify(body).includes('TOKEN'), false)
})
