import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const { chromium } = createRequire(new URL('../../../web/package.json', import.meta.url))('@playwright/test')
const root = new URL('../', import.meta.url)
const source = new URL('source/', root)
await mkdir(source, { recursive: true })
const path = (name) => fileURLToPath(new URL(name, source))
const origin = 'https://txguard-gules.vercel.app'
const address = '0x098b716b8aaf21512996dc57eb0615e2383e2f96'
const stacks = 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM'
const txid = '0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082'
const evidence = { capturedAt: new Date().toISOString(), origin, noMocks: true, responses: [], clips: {}, screenshots: [] }
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
const hold = (page, ms) => page.waitForTimeout(ms)
async function cursor(page) {
  // A visible pointer enhances the genuine recording. No product text/data/controls are changed.
  await page.evaluate(() => {
    const pointer = document.createElement('div')
    pointer.id = 'recording-pointer'
    pointer.setAttribute('aria-hidden', 'true')
    pointer.style.cssText = 'position:fixed;left:0;top:0;width:23px;height:30px;pointer-events:none;z-index:2147483647;filter:drop-shadow(1px 2px 2px #0007);transform:translate(-100px,-100px)'
    pointer.innerHTML = '<svg viewBox="0 0 24 32"><path d="M2 2 L3 27 L9 20 L14 30 L19 27 L14 18 L24 18 Z" fill="white" stroke="#172438" stroke-width="1.6"/></svg>'
    document.body.append(pointer)
    window.addEventListener('mousemove', (event) => { pointer.style.transform = `translate(${event.clientX}px,${event.clientY}px)` })
  })
}
async function move(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (box) await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5, { steps: 24 })
  await hold(page, 250)
}
async function click(page, locator) { await move(page, locator); await locator.click() }
async function frame(page, locator, offset = 95) {
  await locator.evaluate((element, top) => window.scrollTo({ top: Math.max(0, element.getBoundingClientRect().top + scrollY - top), behavior: 'smooth' }), offset)
  await hold(page, 1100)
}
async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: path(`${name}.png`), fullPage })
  evidence.screenshots.push(`${name}.png`)
}
function observe(page) {
  page.on('response', async response => {
    if (new URL(response.url()).origin !== origin || !new URL(response.url()).pathname.startsWith('/api/')) return
    let body
    try { body = await response.json() } catch { return }
    evidence.responses.push({ at: new Date().toISOString(), route: new URL(response.url()).pathname, status: response.status(), body })
  })
}
let context
try {
  context = await browser.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1, recordVideo: { dir: path('raw'), size: { width: 1600, height: 800 } } })
  const page = await context.newPage()
  const start = Date.now()
  const markers = {}
  evidence.clips.desktop = { file: 'desktop-session.webm', width: 1600, height: 800, markers }
  const mark = name => { markers[name] = (Date.now() - start) / 1000; console.log(`capture ${name}: ${markers[name].toFixed(2)}s`) }
  observe(page)
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 40000 })
  await page.getByLabel('Recipient address', { exact: true }).waitFor()
  await cursor(page)
  mark('home')
  await shot(page, 'desktop-home')
  await page.mouse.move(1130, 380, { steps: 35 })
  await hold(page, 5500)
  mark('scanStart')
  await click(page, page.getByLabel('Blockchain', { exact: true }))
  await page.getByLabel('Blockchain', { exact: true }).selectOption('bnb')
  await hold(page, 650)
  await page.getByLabel('Blockchain', { exact: true }).selectOption('ethereum')
  const wallet = page.getByLabel('Recipient address', { exact: true })
  await click(page, wallet)
  await wallet.pressSequentially(address, { delay: 42 })
  await hold(page, 650)
  mark('scanClick')
  await click(page, page.getByRole('button', { name: 'Check address', exact: true }))
  await page.locator('.risk-category').waitFor({ timeout: 25000 })
  await frame(page, page.locator('#report'), 85)
  mark('report')
  evidence.actualCategory = await page.locator('.risk-category').innerText()
  await shot(page, 'desktop-report')
  await shot(page, 'desktop-report-full', true)
  await hold(page, 5000)
  await click(page, page.getByRole('button', { name: 'Save wallet', exact: true }))
  await frame(page, page.locator('.report-columns'))
  mark('signals')
  await shot(page, 'desktop-signals')
  await hold(page, 4500)
  await frame(page, page.locator('.coverage-panel'))
  mark('coverage')
  await shot(page, 'desktop-sources')
  await hold(page, 3500)
  await frame(page, page.locator('.chat-panel'))
  await click(page, page.getByLabel('Your question', { exact: true }))
  await page.getByLabel('Your question', { exact: true }).pressSequentially('What do these findings mean?', { delay: 45 })
  await click(page, page.getByRole('button', { name: 'Ask TxGuard', exact: true }))
  await page.locator('.chat-panel .answer').waitFor({ timeout: 25000 })
  await frame(page, page.locator('.chat-panel'))
  mark('explanation')
  await shot(page, 'desktop-explanation')
  await hold(page, 4500)
  await click(page, page.getByRole('button', { name: 'View receipt tools', exact: true }))
  await frame(page, page.locator('.receipt-tools'))
  await click(page, page.getByLabel('Existing Stacks receipt transaction ID', { exact: true }))
  await page.getByLabel('Existing Stacks receipt transaction ID', { exact: true }).pressSequentially(txid, { delay: 30 })
  await click(page, page.getByRole('button', { name: 'Verify receipt', exact: true }))
  await page.locator('.receipt-tools .answer').waitFor({ timeout: 18000 })
  await frame(page, page.locator('.receipt-tools form'), 190)
  mark('receipt')
  evidence.receiptText = await page.locator('.receipt-tools .answer').innerText()
  await shot(page, 'desktop-receipt')
  await hold(page, 5500)
  try {
    const popupPromise = context.waitForEvent('page', { timeout: 10000 })
    await click(page, page.getByRole('link', { name: 'View transaction on Stacks explorer' }))
    const explorer = await popupPromise
    const explorerStart = Date.now()
    await explorer.waitForLoadState('domcontentloaded', { timeout: 30000 })
    await hold(explorer, 6000)
    evidence.explorer = { url: explorer.url(), title: await explorer.title(), source: 'actual explorer page; not rewritten' }
    await shot(explorer, 'stacks-explorer')
    await hold(explorer, 4000)
    const explorerVideo = explorer.video()
    await explorer.close()
    await explorerVideo.saveAs(path('explorer-session.webm'))
    evidence.clips.explorer = { file: 'explorer-session.webm', ready: (Date.now() - explorerStart) / 1000 - 10 }
  } catch (error) { evidence.explorer = { unavailable: true, error: error.message.slice(0, 200) } }
  await page.bringToFront()
  await frame(page, page.locator('#report'))
  await click(page, page.getByRole('button', { name: 'Transaction history', exact: true }))
  await page.locator('.history-panel .transaction,.history-panel [role="alert"],.history-panel .empty').first().waitFor({ timeout: 23000 })
  await frame(page, page.locator('.report-tabs'), 105)
  mark('history')
  await shot(page, 'desktop-history')
  evidence.historyCount = await page.locator('.history-panel .transaction').count()
  await hold(page, 5500)
  await click(page, page.getByRole('link', { name: 'Scan Wallet', exact: true }))
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await hold(page, 1200)
  await page.getByLabel('Blockchain', { exact: true }).selectOption('stacks')
  await page.getByLabel('Recipient address', { exact: true }).fill(stacks)
  await click(page, page.getByRole('button', { name: 'Check address', exact: true }))
  await page.locator('.risk-category').waitFor({ timeout: 25000 })
  await click(page, page.getByRole('button', { name: 'Save wallet', exact: true }))
  await click(page, page.getByRole('link', { name: 'Dashboard', exact: true }))
  await page.locator('.wallet-card').nth(1).waitFor()
  mark('dashboard')
  await shot(page, 'desktop-dashboard')
  await hold(page, 6500)
  await click(page, page.getByRole('link', { name: 'Scan Wallet', exact: true }))
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await hold(page, 1200)
  mark('chains')
  for (const chain of ['ethereum', 'bnb', 'solana', 'bitcoin', 'stacks']) {
    await click(page, page.getByLabel('Blockchain', { exact: true }))
    await page.getByLabel('Blockchain', { exact: true }).selectOption(chain)
    await hold(page, 1100)
    await shot(page, `chain-${chain}`)
  }
  mark('end')
  const video = page.video()
  await page.close()
  await video.saveAs(path('desktop-session.webm'))
  evidence.clips.desktop = { file: 'desktop-session.webm', width: 1600, height: 800, markers }
  await context.close()
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, recordVideo: { dir: path('raw'), size: { width: 390, height: 844 } } })
  const mobile = await context.newPage()
  observe(mobile)
  const mobileStart = Date.now()
  await mobile.goto(origin, { waitUntil: 'networkidle', timeout: 40000 })
  await mobile.getByLabel('Recipient address', { exact: true }).waitFor()
  evidence.clips.mobile = { file: 'mobile-session.webm', width: 390, height: 844, home: (Date.now() - mobileStart) / 1000 }
  await shot(mobile, 'mobile-home')
  await hold(mobile, 5000)
  await mobile.getByLabel('Recipient address', { exact: true }).fill(address)
  await mobile.getByRole('button', { name: 'Check address', exact: true }).click()
  await mobile.locator('.risk-category').waitFor({ timeout: 25000 })
  await frame(mobile, mobile.locator('.risk-overview'), 70)
  evidence.clips.mobile.report = (Date.now() - mobileStart) / 1000
  await shot(mobile, 'mobile-report')
  await hold(mobile, 5000)
  const mobileVideo = mobile.video()
  await mobile.close()
  await mobileVideo.saveAs(path('mobile-session.webm'))
  evidence.complete = true
} catch (error) {
  evidence.error = error.message
  console.error(error)
  process.exitCode = 1
} finally {
  await context?.close().catch(() => {})
  await browser.close()
  await writeFile(path('capture-evidence.json'), JSON.stringify(evidence, null, 2))
}
