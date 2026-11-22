import { mkdir, writeFile } from 'node:fs/promises'

// Maintenance tool only; builds use committed assets and never download from third parties.
const root = new URL('../public/fonts/', import.meta.url)
await mkdir(root, { recursive: true })
const response = await fetch(
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Space+Grotesk:wght@300..700&display=optional',
  {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(10000),
  },
)
if (!response.ok) throw new Error('Font stylesheet unavailable')
const css = await response.text()
for (const [family, filename, directory] of [
  ['Manrope', 'manrope-latin.woff2', 'manrope'],
  ['Space Grotesk', 'space-grotesk-latin.woff2', 'spacegrotesk'],
]) {
  const block = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)]
    .map((m) => m[1])
    .find((text) => text.includes(`font-family: '${family}'`) && text.includes('U+0000-00FF'))
  const url = block?.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1]
  if (!url) throw new Error(`Missing Latin font for ${family}`)
  const font = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!font.ok) throw new Error('Font download failed')
  const bytes = Buffer.from(await font.arrayBuffer())
  if (bytes.length > 100000 || bytes.subarray(0, 4).toString() !== 'wOF2')
    throw new Error('Invalid font asset')
  const license = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${directory}/OFL.txt`,
    { signal: AbortSignal.timeout(10000) },
  )
  if (!license.ok) throw new Error('Missing font license')
  await writeFile(new URL(filename, root), bytes)
  await writeFile(
    new URL(`OFL-${directory}.txt`, root),
    (await license.text()).replace(/[\t ]+$/gm, ''),
  )
  console.log(`${family}: ${bytes.length} bytes, SIL license included`)
}
