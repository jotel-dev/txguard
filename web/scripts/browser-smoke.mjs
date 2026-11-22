import { chromium, firefox, webkit, devices } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const results = []
for (const [name, engine, options, device] of [
  ['Firefox', firefox, {}, {}],
  ['WebKit engine (not native Safari)', webkit, {}, {}],
  [
    'Android emulation (not a physical device)',
    chromium,
    { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' },
    devices['Pixel 5'],
  ],
]) {
  let browser
  try {
    browser = await engine.launch({ headless: true, ...options })
  } catch (error) {
    if (/Executable doesn't exist|Host system is missing dependencies/i.test(error.message)) {
      results.push({ name, status: 'unavailable' })
      continue
    }
    throw error
  }
  try {
    const context = await browser.newContext({ ...device, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('http://127.0.0.1:4173')
    await page.getByLabel('Recipient address', { exact: true }).waitFor()
    await page.waitForFunction(
      () =>
        !document.getElementById('wallet').disabled && !document.querySelector('fieldset').disabled,
    )
    await page.getByLabel('Blockchain', { exact: true }).selectOption('bitcoin')
    await page
      .getByLabel('Recipient address', { exact: true })
      .fill('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
    if (!(await page.getByRole('button', { name: 'Check address', exact: true }).isEnabled()))
      throw Error(`${name}: validator/control failed`)
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await page.getByRole('heading', { name: 'A clearer view of your wallets.' }).waitFor()
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error(`${name}: horizontal overflow`)
    if (errors.length) throw Error(`${name}: browser runtime errors`)
    results.push({
      name,
      status: 'passed',
      engineVersion: browser.version(),
      checks: [
        'production hydration',
        'Bitcoin checksum input',
        'scan control',
        'dashboard navigation',
        'no overflow',
        'no page errors',
      ],
    })
  } finally {
    await browser.close()
  }
}
await writeFile(
  '../docs/browser-verification.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      note: 'Additional engine smoke checks. These supplement the deterministic E2E suite. WebKit is not a claim of native Safari testing; Android is emulation, not a physical device.',
      results,
    },
    null,
    2,
  ),
)
console.log(JSON.stringify(results))
