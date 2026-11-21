import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
})
const results = []
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
  await page.goto('http://127.0.0.1:5173')
  await page.getByRole('button', { name: 'Load documented address' }).click()
  const start = performance.now()
  const pending = page.waitForResponse((response) => response.url().endsWith('/api/analyze'))
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  const response = await pending
  const report = await response.json()
  console.log(
    JSON.stringify({
      browserScanStatus: response.status(),
      riskLabel: report.riskLabel,
      error: report.error,
    }),
  )
  if (!response.ok()) throw new Error('Live browser scan returned an API error')
  await page.locator('.risk-category').waitFor()
  results.push({
    scenario: 'Genuine browser scan of sourced historical address',
    status: response.status(),
    latencyMs: Math.round(performance.now() - start),
    riskScore: report.riskScore,
    riskLabel: report.riskLabel,
    sources: report.sources,
  })
  await page
    .locator('#report')
    .screenshot({ path: '../docs/screenshots/live-recipient-report.png' })
  const targets = {
    ethereum: '0x0000000000000000000000000000000000000001',
    bnb: '0x0000000000000000000000000000000000000001',
    bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    solana: '11111111111111111111111111111111',
    stacks: 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM',
  }
  for (const [chain, wallet] of Object.entries(targets)) {
    const start = performance.now()
    const res = await context.request.post('http://127.0.0.1:5173/api/analyze', {
      data: { wallet, chain },
      timeout: 20000,
    })
    const data = await res.json()
    results.push({
      scenario: `Live ${chain} scan API`,
      status: res.status(),
      latencyMs: Math.round(performance.now() - start),
      riskScore: data.riskScore,
      riskLabel: data.riskLabel,
      balance: data.balance,
      sources: data.sources,
    })
    if (['bitcoin', 'solana', 'stacks'].includes(chain) && data.riskScore !== null)
      throw new Error('Unexpected security score on unsupported intelligence chain')
  }
  const invalid = await context.request.post('http://127.0.0.1:5173/api/analyze', {
    data: { wallet: 'bad', chain: 'bitcoin' },
  })
  results.push({ scenario: 'Invalid live API input', status: invalid.status() })
  await writeFile(
    '../docs/live-flow-verification.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        note: 'Local application endpoints and a real browser using actual external provider data. No fabricated intelligence, signing or paid transactions. This is a small sample, not a production error-rate estimate.',
        results,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
