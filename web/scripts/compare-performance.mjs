import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const targets = JSON.parse(
  process.env.PERF_TARGETS ||
    '{"submitted":"http://127.0.0.1:4181","before":"http://127.0.0.1:4182","after":"http://127.0.0.1:4183"}',
)
const samples = []
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
})
try {
  for (let run = 0; run < 3; run++) {
    const entries = Object.entries(targets)
    if (run % 2) entries.reverse()
    for (const [revision, url] of entries) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 1000 },
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      await page.route('https://fonts.googleapis.com/**', (r) => r.abort())
      await page.route('https://fonts.gstatic.com/**', (r) => r.abort())
      await page.addInitScript(() => {
        window.lab = { lcp: null, cls: 0, longTasks: [], interactions: [] }
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.lab.lcp = e.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.lab.cls += e.value
        }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            window.lab.longTasks.push({ start: e.startTime, duration: e.duration })
        }).observe({ type: 'longtask', buffered: true })
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (e.interactionId)
              window.lab.interactions.push({
                name: e.name,
                duration: e.duration,
                id: e.interactionId,
              })
        }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
      })
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
      })
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      await page.waitForFunction(() => window.lab.lcp !== null)
      const metrics = await page.evaluate(() => ({
        ...window.lab,
        htmlBytes: performance.getEntriesByType('navigation')[0].decodedBodySize,
        resources: performance.getEntriesByType('resource').map((r) => ({
          name: new URL(r.name).pathname,
          start: r.startTime,
          duration: r.duration,
          bytes: r.decodedBodySize,
        })),
      }))
      await page.waitForFunction(() => !document.getElementById('wallet').disabled)
      await page.getByLabel('Recipient address', { exact: true }).click()
      await page.getByLabel('Recipient address', { exact: true }).pressSequentially('0x1234')
      await page.getByLabel('Blockchain', { exact: true }).selectOption('bitcoin')
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      const interactions = await page.evaluate(() => window.lab.interactions)
      samples.push({
        revision,
        run: run + 1,
        ...metrics,
        interactions,
        maxObservedInteractionMs: Math.max(0, ...interactions.map((e) => e.duration)),
      })
      console.log(
        JSON.stringify({
          revision,
          run: run + 1,
          lcp: metrics.lcp,
          cls: metrics.cls,
          maxObservedInteractionMs: samples.at(-1).maxObservedInteractionMs,
        }),
      )
      await context.close()
    }
  }
} finally {
  const result = {
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    method:
      'Three cold contexts per revision; alternating order, same local static server/browser; 390x1000, 4x CPU, 150ms, 1.6Mbps down / 750kbps up, cache disabled, reduced motion, external fonts blocked. Metrics precede interactions. EventTiming is a small lab sample, not field INP. No other benchmark intentionally run concurrently.',
    samples,
    medians: Object.fromEntries(
      Object.keys(targets).map((key) => [
        key,
        samples
          .filter((s) => s.revision === key)
          .map((s) => s.lcp)
          .sort((a, b) => a - b)[1] ?? null,
      ]),
    ),
  }
  await writeFile(
    process.env.PERF_OUTPUT || '../docs/brand-mobile-performance.json',
    JSON.stringify(result, null, 2),
  )
  await browser.close()
}
