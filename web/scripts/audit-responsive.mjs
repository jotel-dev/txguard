import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { makeExample } from '../src/examples.js'
const phase = process.env.AUDIT_PHASE || 'after'
const origin = process.env.AUDIT_URL || 'http://127.0.0.1:4183'
const output = fileURLToPath(new URL(`../../.cache/brand-mobile/${phase}/`, import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
})
const widths = [320, 360, 375, 390, 414, 428, 480, 768, 1024, 1440, 1920]
const screenshotWidths = new Set([360, 390, 428, 768, 1440])
const wallet = '0x52908400098527886E0F7030069857D2E4169EE7'
const report = {
  ...makeExample('unavailable'),
  mode: 'live',
  wallet,
  scanId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  policy: 'txguard-evidence-v2',
  assessedAt: '2026-11-24T12:00:00.000Z',
  commitment: 'a'.repeat(64),
  balance: '12345678901234567890.123456789012345678 ETH',
  totalTransactions: 'Not established',
  sources: [{ name: 'UI test provider', status: 'unavailable' }],
  summary:
    'UI test fixture. This illustrates unavailable security coverage, not live blockchain intelligence.',
}
const results = []
try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route('**/api/analyze', (r) => r.fulfill({ json: report }))
    await page.route('**/api/transactions?**', (r) =>
      r.fulfill({
        json: {
          transactions: [
            {
              hash: `0x${'b'.repeat(64)}`,
              from: wallet,
              to: wallet,
              amount: '1.000000000000000001',
              asset: 'ETH',
              timestamp: null,
              status: 'Pending',
              kind: 'UI fixture native transfer',
            },
          ],
          limitations: ['UI test fixture. Not live data.'],
        },
      }),
    )
    await page.route('**/api/ask', (r) =>
      r.fulfill({
        json: {
          answer: 'UI test fixture: coverage is unavailable. Verify independently.',
          source: 'Deterministic UI fixture',
        },
      }),
    )
    await page.route('**/api/registry*', (r) =>
      r.fulfill({
        json: {
          status: 'Pending',
          verified: false,
          note: 'UI test fixture. Pending is not confirmed.',
        },
      }),
    )
    await page.goto(origin)
    await page.getByLabel('Recipient address', { exact: true }).waitFor()
    await page.waitForFunction(() => !document.getElementById('wallet').disabled)
    await page.addStyleTag({
      content:
        'body::after{content:"UI TEST FIXTURE · NOT LIVE DATA";position:fixed;right:0;bottom:0;padding:5px 9px;background:#101827;color:white;font:11px Arial;z-index:99999;pointer-events:none}',
    })
    async function capture(state, selector) {
      const scope = selector ? page.locator(selector).first() : page.locator('body')
      await scope.waitFor({ state: 'visible' })
      results.push({
        width,
        state,
        ...(await page.evaluate(() => {
          const visible = (el) =>
            el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            overflowing: [...document.querySelectorAll('body *')]
              .filter(visible)
              .filter(
                (el) =>
                  el.getBoundingClientRect().right > innerWidth + 1 ||
                  el.getBoundingClientRect().left < -1,
              )
              .slice(0, 12)
              .map((el) => ({ tag: el.tagName, class: el.className })),
            smallLabels: [
              ...document.querySelectorAll(
                'label,nav a,.eyebrow,.small,.transaction dt,.transaction dd,.source-row',
              ),
            ]
              .filter(visible)
              .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
              .map((el) => ({
                text: el.textContent.slice(0, 55),
                px: getComputedStyle(el).fontSize,
              })),
            smallTargets: [...document.querySelectorAll('button,nav a,input,select,summary')]
              .filter(visible)
              .filter((el) => {
                const r = el.getBoundingClientRect()
                return r.width < 43.5 || r.height < 43.5
              })
              .map((el) => ({
                text: (el.getAttribute('aria-label') || el.textContent).slice(0, 55),
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height,
              })),
          }
        })),
      })
      if (screenshotWidths.has(width)) {
        if (selector) await scope.screenshot({ path: `${output}/${width}-${state}-fixture.png` })
        else await page.screenshot({ path: `${output}/${width}-${state}-fixture.png` })
      }
    }
    await capture('landing')
    await capture('scanner', '.scan-card')
    await page.locator('.optional-context summary').click()
    await capture('transfer-context', '.scan-card')
    await page.locator('.optional-context summary').click()
    const menu = page.getByRole('button', { name: 'Menu', exact: true })
    if (await menu.isVisible()) {
      await menu.click()
      await capture('mobile-navigation', '.site-header')
      await page.keyboard.press('Escape')
    }
    await capture('how-it-works', '#how-it-works')
    await capture('examples', '.examples-section')
    await capture('footer', 'footer')
    await page.getByLabel('Recipient address', { exact: true }).fill(wallet)
    await page.getByRole('button', { name: 'Check address', exact: true }).click()
    await capture('report', '.report-section')
    await page.getByLabel('Your question').fill('What does missing coverage mean?')
    await page.getByRole('button', { name: 'Ask TxGuard', exact: true }).click()
    await page.locator('.answer').waitFor()
    await capture('ask-ai', '.chat-panel')
    await page.getByRole('button', { name: 'View receipt tools' }).click()
    await page.getByLabel('Existing Stacks receipt transaction ID').fill('a'.repeat(64))
    await page.getByRole('button', { name: 'Verify receipt', exact: true }).click()
    await page.getByText('UI test fixture. Pending is not confirmed.').waitFor()
    await capture('receipt', '.receipt-panel')
    await page.getByRole('button', { name: 'Transaction history', exact: true }).click()
    await page.locator('.transaction-status').waitFor()
    await page.getByLabel('Token contract address').waitFor()
    await capture('transactions', '.history-panel')
    await page.getByRole('button', { name: 'Save wallet', exact: true }).click()
    // Hash navigation also works with the future mobile menu collapsed.
    await page.evaluate(() => {
      location.hash = 'dashboard'
    })
    await page.locator('.wallet-card').waitFor()
    await capture('dashboard', '.page-section')
    await page.getByRole('button', { name: 'Add wallet', exact: true }).click()
    await capture('add-wallet', '.add-form')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Remove Ethereum wallet', exact: true }).click()
    await capture('empty-dashboard', '.page-section')
    await page.evaluate(() => {
      location.hash = 'history'
    })
    await page.locator('.history-row').waitFor()
    await capture('history', '.page-section')
    await page.getByRole('button', { name: 'Clear history', exact: true }).click()
    await capture('empty-history', '.page-section')
    await page.evaluate(() => {
      location.hash = 'scan'
    })
    await page.getByLabel('Recipient address', { exact: true }).fill('not-a-wallet')
    await capture('invalid-address', '.scan-card')
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    await page.route('**/api/analyze', async (r) => {
      await gate
      await r.fulfill({
        status: 503,
        json: { error: 'UI fixture provider unavailable. Please retry.' },
      })
    })
    await page.getByLabel('Recipient address', { exact: true }).fill(wallet)
    await page.getByRole('button', { name: 'Check address', exact: true }).click()
    await capture('loading', '.loading-panel')
    release()
    await page.getByText('UI fixture provider unavailable. Please retry.').waitFor()
    await capture('provider-error', '.scan-card')
    results.push({ width, state: 'runtime', errors })
    await context.close()
    console.log(`${phase}: ${width}px reviewed`)
  }
} finally {
  await writeFile(
    `${output}/audit.json`,
    JSON.stringify(
      {
        phase,
        origin,
        note: 'UI fixtures and browser emulation only; no live intelligence claims. Screenshots retain a fixture watermark.',
        results,
      },
      null,
      2,
    ),
  )
  await browser.close()
}
