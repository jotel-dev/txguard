import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = new URL('../public/', import.meta.url)
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
})
const files = []
const dataSvg = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
try {
  const page = await browser.newPage()
  async function render(path, width, height, html) {
    await page.setViewportSize({ width, height })
    await page.setContent(
      `<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:transparent}img{display:block;max-width:100%}</style>${html}`,
    )
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((i) => i.decode()))
    })
    const bytes = await page.screenshot({ omitBackground: true })
    await writeFile(new URL(path, root), bytes)
    files.push({
      path,
      width,
      height,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
    return bytes
  }
  for (const variant of ['blue', 'black', 'white']) {
    for (const kind of ['symbol', 'horizontal']) {
      const svg = await readFile(new URL(`brand/txguard-${kind}-${variant}.svg`, root), 'utf8')
      const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
      const width = kind === 'symbol' ? 1024 : 1600
      const height = Math.round((width * Number(viewBox[2])) / Number(viewBox[1]))
      await render(
        `brand/txguard-${kind}-${variant}.png`,
        width,
        height,
        `<img width="${width}" height="${height}" src="${dataSvg(svg)}">`,
      )
    }
  }
  const blue = await readFile(new URL('brand/txguard-symbol-blue.svg', root), 'utf8')
  const primary = await readFile(new URL('brand/txguard-primary.svg', root), 'utf8')
  const primaryViewBox = primary.match(/viewBox="0 0 (\d+) (\d+)"/)
  const primaryHeight = Math.round((1600 * Number(primaryViewBox[2])) / Number(primaryViewBox[1]))
  await render(
    'brand/txguard-primary.png',
    1600,
    primaryHeight,
    `<img width="1600" height="${primaryHeight}" src="${dataSvg(primary)}">`,
  )
  const white = await readFile(new URL('brand/txguard-symbol-white.svg', root), 'utf8')
  await render(
    'apple-touch-icon.png',
    180,
    180,
    `<div style="width:180px;height:180px;background:white;display:grid;place-items:center"><img width="132" height="132" src="${dataSvg(blue)}"></div>`,
  )
  await render(
    'brand/txguard-profile.png',
    1024,
    1024,
    `<div style="width:1024px;height:1024px;background:#2563eb;display:grid;place-items:center"><img width="700" height="700" src="${dataSvg(white)}"></div>`,
  )
  const icons = []
  for (const size of [16, 32, 48])
    icons.push({
      size,
      bytes: await render(
        `brand/favicon-${size}.png`,
        size,
        size,
        `<img width="${size}" height="${size}" src="${dataSvg(blue)}">`,
      ),
    })
  const header = Buffer.alloc(6 + 16 * icons.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(icons.length, 4)
  let offset = header.length
  icons.forEach(({ size, bytes }, i) => {
    const start = 6 + i * 16
    header[start] = size
    header[start + 1] = size
    header.writeUInt16LE(1, start + 4)
    header.writeUInt16LE(32, start + 6)
    header.writeUInt32LE(bytes.length, start + 8)
    header.writeUInt32LE(offset, start + 12)
    offset += bytes.length
  })
  await writeFile(
    new URL('favicon.ico', root),
    Buffer.concat([header, ...icons.map((i) => i.bytes)]),
  )
  const font = (
    await readFile(new URL('../public/fonts/space-grotesk-latin.woff2', import.meta.url))
  ).toString('base64')
  const horizontal = primary
  await render(
    'brand/txguard-open-graph.png',
    1200,
    630,
    `<style>@font-face{font-family:Brand;src:url(data:font/woff2;base64,${font})}body{background:#f7f8fa;font-family:Brand,Arial;color:#111827}main{padding:56px 70px;height:630px;position:relative;border-top:8px solid #2563eb}h1{font-size:76px;line-height:1.05;letter-spacing:-4px;margin:50px 0 25px;max-width:700px}.note{font-size:22px;color:#475569}.mark{position:absolute;right:80px;top:220px;width:210px;height:210px;border-radius:32px;background:#2563eb;padding:30px}.bottom{position:absolute;left:70px;bottom:45px;font-size:15px;letter-spacing:1.3px;color:#475569}</style><main><img src="${dataSvg(horizontal)}" width="238" alt="TxGuard"><h1>Know Before<br>You Send.</h1><p class="note">Clear evidence before your next crypto transfer.</p><div class="mark"><img src="${dataSvg(white)}"></div><div class="bottom">PUBLIC ADDRESS CHECKS · FIVE NETWORKS · CLEAR COVERAGE LIMITS</div></main>`,
  )
  await writeFile(
    new URL('brand/raster-manifest.json', root),
    JSON.stringify(
      {
        approvedConcept: 'Letterform — geometric T/G monogram',
        color: '#2563eb',
        note: 'Transparent logo PNGs; solid backgrounds for Apple touch, social profile and Open Graph. Generated using outlined SVG sources; no runtime image-generation dependency.',
        files,
      },
      null,
      2,
    ),
  )
  console.log(
    `Exported ${files.length} PNGs and a 16/32/48px ICO. SVG and PNG production assets are self-hosted.`,
  )
} finally {
  await browser.close()
}
