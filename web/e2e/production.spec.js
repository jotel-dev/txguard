import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { makeExample } from '../src/examples.js'

test('production HTML paints public content before JavaScript; controls wait for hydration', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort())
    await page.goto('http://127.0.0.1:4173')
    await expect(page.getByRole('heading', { name: 'Know Before You Send.' })).toBeVisible()
    await expect(page.getByLabel('Recipient address', { exact: true })).toBeDisabled()
    await expect(page.locator('#root')).toHaveAttribute('data-prerendered', 'true')
  } finally {
    await context.close()
  }
})

test('production hydration, all five validators, report, persistence and direct hash routes work', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && /hydration|did not match|#418|#425/i.test(m.text()))
      errors.push(m.text())
  })
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort())
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort())
  await page.route('**/api/analyze', async (route) => {
    const input = route.request().postDataJSON()
    await route.fulfill({
      json: {
        ...makeExample('unavailable'),
        ...input,
        mode: 'live',
        scanId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        policy: 'txguard-evidence-v2',
        assessedAt: '2026-11-21T12:00:00.000Z',
        balance: 'Unavailable',
        commitment: 'c'.repeat(64),
      },
    })
  })
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByLabel('Recipient address', { exact: true })).toBeEnabled()
  for (const [chain, address] of [
    ['ethereum', '0x52908400098527886E0F7030069857D2E4169EE7'],
    ['bnb', '0x52908400098527886E0F7030069857D2E4169EE7'],
    ['bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
    ['solana', '11111111111111111111111111111111'],
    ['stacks', 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM'],
  ]) {
    await page.getByLabel('Blockchain', { exact: true }).selectOption(chain)
    await page.getByLabel('Recipient address', { exact: true }).fill(address)
    await expect(page.getByRole('button', { name: 'Check address', exact: true })).toBeEnabled()
  }
  await page.getByRole('button', { name: 'Check address', exact: true }).click()
  await expect(page.locator('.risk-category')).toHaveText('Insufficient data')
  await page.getByRole('button', { name: 'Save wallet', exact: true }).click()
  await page.goto('http://127.0.0.1:4173/#dashboard')
  await expect(page.locator('.wallet-card')).toHaveCount(1)
  await page.goto('http://127.0.0.1:4173/#history')
  await expect(page.locator('.history-row')).toHaveCount(1)
  await page.goto('http://127.0.0.1:4173/#how-it-works')
  await expect(
    page.getByRole('heading', { name: 'A clearer check, in three steps.' }),
  ).toBeVisible()
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  expect(errors).toEqual([])
})

test('failed interactive bundle keeps public content and offers reload recovery', async ({
  page,
}) => {
  await page.route('**/assets/bootstrap-*.js', (route) => route.abort())
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByRole('heading', { name: 'Know Before You Send.' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Address controls could not load')
  await expect(page.getByLabel('Recipient address', { exact: true })).toBeDisabled()
  await page.unroute('**/assets/bootstrap-*.js')
  await page.getByRole('button', { name: 'Reload page', exact: true }).click()
  await expect(page.getByLabel('Recipient address', { exact: true })).toBeEnabled()
})
