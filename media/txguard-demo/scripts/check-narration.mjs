import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const require = createRequire(new URL('../../../.cache/video-tools/package.json', import.meta.url))
const { pipeline } = require('@huggingface/transformers')
const ffmpeg = require('ffmpeg-static')
const root = fileURLToPath(new URL('../', import.meta.url))
console.log('Loading a separate English speech recognizer to check the generated narration')
const recognizer = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', { dtype: 'q8', device: 'cpu' })
let timing
for (let attempt = 0; attempt < 300; attempt++) {
  try { timing = JSON.parse(await readFile(`${root}/audio/timing.json`, 'utf8')); break } catch { await new Promise(resolve => setTimeout(resolve, 2000)) }
}
if (!timing) throw Error('Narration timing not ready within the bounded wait')
function normalize(text) {
  return text.toLowerCase().replace(/t[\s.-]*x[\s.-]*guard|tx[\s-]*guard|text guard|tax guard/g, 'txguard').replace(/web\s*(three|3)/g, 'web3').replace(/b[\s.-]*n[\s.-]*b|b and b/g, 'bnb').replace(/p[\s.-]*(two|2)[\s.-]*p/g, 'p2p').replace(/main\s+net/g, 'mainnet').replace(/\bfive\b/g, '5').replace(/\bbnb chains\b/g, 'bnb chain').replace(/\bno before you send\b/g, 'know before you send').replace(/-/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().split(' ')
}
function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] !== b[j - 1])); row = next }
  return row[b.length]
}
const onlyScene = Number(process.argv.find(arg => arg.startsWith('--scene='))?.split('=')[1]) || null
let previous = []
try { previous = JSON.parse(await readFile(`${root}/review/narration-transcription.json`, 'utf8')).checks } catch {}
const checks = []
for (const segment of timing.segments) {
  const existing = onlyScene && onlyScene !== segment.scene ? previous.find(check => check.file === segment.file) : null
  if (existing) {
    const expected = normalize(segment.text), heard = normalize(existing.recognized)
    const errorRate = distance(expected, heard) / expected.length
    checks.push({ ...existing, normalizedWordErrorRate: errorRate, needsReview: errorRate > .2 })
    continue
  }
  const decoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', segment.file, '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'], { cwd: root, windowsHide: true, maxBuffer: 10e6 })
  if (decoded.status !== 0) throw Error(decoded.stderr.toString())
  const samples = new Float32Array(decoded.stdout.buffer, decoded.stdout.byteOffset, decoded.stdout.byteLength / 4)
  const result = await recognizer(samples, { max_new_tokens: 128 })
  const expected = normalize(segment.text), heard = normalize(result.text)
  const errorRate = distance(expected, heard) / expected.length
  checks.push({ scene: segment.scene, file: segment.file, expected: segment.text, recognized: result.text.trim(), normalizedWordErrorRate: errorRate, needsReview: errorRate > .2 })
  console.log(`Scene ${segment.scene}: ${result.text.trim()} [normalized WER ${(100 * errorRate).toFixed(1)}%]`)
}
await writeFile(`${root}/review/narration-transcription.json`, JSON.stringify({ engine: 'Whisper tiny.en ONNX q8, independent of the speech generator', method: 'Each real generated phrase decoded to 16 kHz and transcribed separately. Proper-name spellings normalized; ASR is a review aid, not a human listening claim.', checks }, null, 2))
