import { chromium } from '@playwright/test'
import { mkdir, writeFile, readdir, readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless:true })
await mkdir('../docs/screenshots',{recursive:true})
const results=[]
try {
  for(const [label,width,throttle] of [['desktop',1440,false],['mobile-lab',390,true]]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'})
    const page=await context.newPage()
    await page.route('https://fonts.googleapis.com/**',route=>route.abort())
    await page.route('https://fonts.gstatic.com/**',route=>route.abort())
    await page.addInitScript(()=>{
      window.lab={lcp:null,cls:0}
      new PerformanceObserver(list=>{for(const entry of list.getEntries())window.lab.lcp=entry.startTime}).observe({type:'largest-contentful-paint',buffered:true})
      new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.lab.cls+=entry.value}).observe({type:'layout-shift',buffered:true})
    })
    if(throttle) {
      const cdp=await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750})
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
    }
    await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'})
    await page.screenshot({path:`../docs/screenshots/${label}-home.png`,fullPage:true})
    const metrics=await page.evaluate(()=>{
      const navigation=performance.getEntriesByType('navigation')[0]
      return {lcpMs:window.lab.lcp,cls:window.lab.cls,domContentLoadedMs:navigation.domContentLoadedEventEnd,loadMs:navigation.loadEventEnd,jsHeapUsedBytes:performance.memory?.usedJSHeapSize ?? null,hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth}
    })
    await page.getByRole('button',{name:/An unavailable provider/}).click()
    await page.locator('.risk-category').waitFor()
    await page.locator('#report').screenshot({path:`../docs/screenshots/${label}-example-report.png`})
    results.push({label,width,throttle:throttle?'4x CPU, 150ms latency, 1.6Mbps down / 750kbps up':'none',...metrics})
    await context.close()
  }
  const assets=[]
  for(const file of await readdir('dist/assets')) if(file.endsWith('.js')){const path=`dist/assets/${file}`;assets.push({file,bytes:(await stat(path)).size,gzipBytes:gzipSync(await readFile(path)).length})}
  await writeFile('../docs/performance.json',JSON.stringify({measuredAt:new Date().toISOString(),browser:browser.version(),method:'Local production Vite preview. Google Fonts blocked for deterministic fallback measurement. These are single-run lab observations, not field Core Web Vitals or Lighthouse scores. INP and production API error rate not measured.',results,bundle:{totalJsBytes:assets.reduce((sum,a)=>sum+a.bytes,0),assets}},null,2))
  console.log(JSON.stringify(results,null,2))
} finally { await browser.close() }
