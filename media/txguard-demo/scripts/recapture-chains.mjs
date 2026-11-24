import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'
const { chromium } = createRequire(new URL('../../../web/package.json', import.meta.url))('@playwright/test')
const root = new URL('../', import.meta.url)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 800 } })
  await page.goto('https://txguard-gules.vercel.app', { waitUntil: 'networkidle', timeout: 40000 })
  const control = page.getByLabel('Blockchain', { exact: true })
  for (const chain of ['ethereum', 'bnb', 'solana', 'bitcoin', 'stacks']) {
    await control.selectOption(chain)
    await control.press('Escape')
    await page.mouse.click(1480, 120)
    await page.waitForTimeout(800)
    await page.screenshot({ path: fileURLToPath(new URL(`source/chain-${chain}.png`, root)) })
  }
  await writeFile(new URL('source/selector-capture.json', root), JSON.stringify({ capturedAt: new Date().toISOString(), url: page.url(), noMocks: true, note: 'Fresh browser context; actual blockchain selector values; native menu dismissed before capture; no product data or interface text altered.' }, null, 2))
} finally { await browser.close() }
