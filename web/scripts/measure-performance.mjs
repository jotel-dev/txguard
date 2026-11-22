import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const target = process.env.PERF_URL || 'http://127.0.0.1:4173'
const output = process.env.PERF_OUTPUT || '../docs/performance-current.json'
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
})
const samples = []
try {
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 1000 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
    await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
    await page.addInitScript(() => {
      window.lab = { lcp: null, cls: 0, element: null, longTasks: [] }
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.lab.lcp = e.startTime
          window.lab.element = {
            tag: e.element?.tagName,
            text: e.element?.textContent?.slice(0, 100),
            size: e.size,
          }
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.lab.cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.lab.longTasks.push({ start: e.startTime, duration: e.duration })
      }).observe({ type: 'longtask', buffered: true })
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
    await page.goto(target, { waitUntil: 'networkidle' })
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
    const sample = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0]
      return {
        ...window.lab,
        loadMs: n.loadEventEnd,
        domContentLoadedMs: n.domContentLoadedEventEnd,
        htmlBytes: n.decodedBodySize,
        resources: performance.getEntriesByType('resource').map((e) => ({
          name: new URL(e.name).pathname,
          duration: e.duration,
          start: e.startTime,
          bytes: e.decodedBodySize,
        })),
        heapBytes: performance.memory?.usedJSHeapSize ?? null,
      }
    })
    samples.push({ run, ...sample })
    console.log(
      JSON.stringify({
        run,
        lcpMs: sample.lcp,
        cls: sample.cls,
        element: sample.element,
        longTaskMs: sample.longTasks.reduce((sum, t) => sum + t.duration, 0),
      }),
    )
    await context.close()
  }
  const sorted = samples.map((s) => s.lcp).sort((a, b) => a - b)
  await writeFile(
    output,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        revision: process.env.PERF_REVISION || 'working-tree',
        browser: browser.version(),
        target,
        method:
          'Three fresh-context production-preview runs; 390x1000, 4x CPU, 150ms latency, 1.6Mbps down/750kbps up, cold HTTP cache, Google Fonts blocked exactly as the prior lab test. Metrics collected before screenshots. Lab observations, not field CWV or Lighthouse.',
        medianLcpMs: sorted[1],
        samples,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
