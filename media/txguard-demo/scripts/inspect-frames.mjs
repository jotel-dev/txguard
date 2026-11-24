import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const require = createRequire(new URL('../../../.cache/video-tools/package.json', import.meta.url))
const ffmpeg = require('ffmpeg-static'), sharp = require('sharp')
const root = fileURLToPath(new URL('../', import.meta.url))
await mkdir(`${root}/review`, { recursive: true })
const final = process.argv.includes('--final')
const source = final ? 'deliverables/TxGuard-90s-1080p.mp4' : 'render/picture.mp4'
const times = [2, 6, 10, 16, 30, 39, 42, 44, 47, 50, 53, 56, 58, 60, 62, 64, 68, 74, 78, 82, 87]
const layers = []
for (let i = 0; i < times.length; i++) {
  const time = times[i], file = `review/${final ? 'final' : 'picture'}-${time}.jpg`
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(time), '-i', source, '-frames:v', '1', '-vf', 'scale=640:360', '-q:v', '2', file], { cwd: root, windowsHide: true, encoding: 'utf8' })
  if (result.status !== 0) throw Error(result.stderr)
  const label = Buffer.from(`<svg width="640" height="392"><rect y="360" width="640" height="32" fill="#101827"/><text x="14" y="382" font-family="Arial" font-size="18" fill="#c6d9f4">${String(time).padStart(2, '0')} seconds — ${final ? 'final master' : 'picture review'}</text></svg>`)
  const cell = await sharp({ create: { width: 640, height: 392, channels: 3, background: '#030812' } }).composite([{ input: await readFile(`${root}/${file}`), top: 0, left: 0 }, { input: label, top: 0, left: 0 }]).jpeg({ quality: 82 }).toBuffer()
  layers.push({ input: cell, top: Math.floor(i / 3) * 392, left: (i % 3) * 640 })
}
await sharp({ create: { width: 1920, height: Math.ceil(times.length / 3) * 392, channels: 3, background: '#030812' } }).composite(layers).jpeg({ quality: 88 }).toFile(`${root}/review/${final ? 'final' : 'picture'}-contact-sheet.jpg`)
await writeFile(`${root}/review/${final ? 'final' : 'picture'}-frame-times.json`, JSON.stringify({ source, times }, null, 2))
console.log(`Extracted ${times.length} genuine exported frames for visual review`)
