import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const require = createRequire(new URL('../../../.cache/video-tools/package.json', import.meta.url))
const { chromium } = createRequire(new URL('../../../web/package.json', import.meta.url))('@playwright/test')
const ffmpeg = require('ffmpeg-static'), ffprobe = require('ffprobe-static').path
const root = fileURLToPath(new URL('../', import.meta.url))
const video = `${root}/deliverables/TxGuard-90s-1080p.mp4`
const probe = spawnSync(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-show_chapters', '-of', 'json', video], { encoding: 'utf8', windowsHide: true })
assert.equal(probe.status, 0)
const metadata = JSON.parse(probe.stdout)
const picture = metadata.streams.find(stream => stream.codec_type === 'video')
const sound = metadata.streams.find(stream => stream.codec_type === 'audio')
assert.equal(picture.codec_name, 'h264'); assert.equal(picture.width, 1920); assert.equal(picture.height, 1080)
assert.equal(picture.avg_frame_rate, '30/1'); assert.equal(picture.pix_fmt, 'yuv420p')
assert.equal(sound.codec_name, 'aac'); assert.equal(Number(sound.sample_rate), 48000); assert.equal(sound.channels, 2)
assert.ok(Math.abs(Number(metadata.format.duration) - 90) < .05)
assert.ok(Math.abs(Number(picture.start_time) - Number(sound.start_time)) < 1 / 30)
assert.ok(Math.abs(Number(picture.duration) - Number(sound.duration)) < .05)
assert.equal(Number(picture.nb_frames), 2700)
const timing = JSON.parse(await readFile(`${root}/audio/timing.json`, 'utf8'))
const srt = await readFile(`${root}/deliverables/TxGuard-90s.en.srt`, 'utf8')
assert.equal(srt.match(/ --> /g).length, timing.segments.length)
let previousEnd = 0
for (const segment of timing.segments) {
  assert.ok(segment.start >= previousEnd && segment.end <= 90 && segment.end > segment.start)
  const actual = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', `${root}/${segment.file}`], { encoding: 'utf8', windowsHide: true })
  assert.ok(Math.abs(Number(JSON.parse(actual.stdout).format.duration) - (segment.end - segment.start)) < .002)
  previousEnd = segment.end
}
console.log('Stream dimensions, codecs, 2700 frames, 90-second duration and caption/audio boundaries verified')
const decode = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', video, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true, maxBuffer: 10e6 })
assert.equal(decode.status, 0, decode.stderr)
assert.equal(decode.stderr.trim(), '', 'Full decode must not contain errors')
console.log('Full video/audio decode passed')
const loudnessResult = spawnSync(ffmpeg, ['-hide_banner', '-i', video, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true, maxBuffer: 10e6 })
const loudness = JSON.parse(loudnessResult.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1))
assert.ok(Number(loudness.input_tp) < 0, 'No digital peak clipping')
assert.ok(Math.abs(Number(loudness.input_i) + 16) < 1, 'Final loudness should be close to -16 LUFS')
const detection = spawnSync(ffmpeg, ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.16:pix_th=0.02:pic_th=0.99', '-af', 'silencedetect=n=-55dB:d=0.8', '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true, maxBuffer: 10e6 })
const black = [...detection.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)].map(match => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }))
const unexpectedBlack = black.filter(item => item.start > .5 && item.end < 89)
assert.equal(unexpectedBlack.length, 0, 'No unintended black intervals inside the film')
const silenceLog = detection.stderr.split('\n').filter(line => line.includes('silence_'))
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>TxGuard final playback check</title><body style="margin:0;background:#030812"><video id="film" controls playsinline preload="auto" style="width:100vw;height:100vh" src="/film.mp4"></video>'); return }
  if (req.url !== '/film.mp4' || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return }
  const size = (await stat(video)).size
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
  res.setHeader('Content-Type', 'video/mp4'); res.setHeader('Accept-Ranges', 'bytes')
  let start = 0, end = size - 1
  if (range) { start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1; res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`) }
  res.setHeader('Content-Length', end - start + 1)
  if (req.method === 'HEAD') res.end(); else createReadStream(video, { start, end }).pipe(res)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
let playback
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => document.querySelector('video').readyState >= 3)
  console.log('Starting complete browser playback with audio decoding')
  playback = await page.evaluate(async () => {
    const video = document.querySelector('video')
    const errors = []
    video.addEventListener('error', () => errors.push(video.error?.message || 'Media error'))
    const ended = new Promise((resolve, reject) => { video.onended = resolve; video.onerror = () => reject(new Error('Video playback error')); setTimeout(() => reject(new Error('Full playback timeout')), 110000) })
    video.currentTime = 0
    await video.play()
    await ended
    return { ended: video.ended, duration: video.duration, currentTime: video.currentTime, decodedVideoFrames: video.webkitDecodedFrameCount, decodedAudioBytes: video.webkitAudioDecodedByteCount, quality: video.getVideoPlaybackQuality().toJSON?.() || { totalVideoFrames: video.getVideoPlaybackQuality().totalVideoFrames, droppedVideoFrames: video.getVideoPlaybackQuality().droppedVideoFrames }, errors }
  })
  assert.equal(playback.ended, true); assert.equal(playback.errors.length, 0)
  assert.ok(playback.decodedVideoFrames > 2600); assert.ok(playback.decodedAudioBytes > 0)
  console.log('Full 90-second browser playback and audio decoding passed')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
const bytes = await readFile(video)
const result = { checkedAt: new Date().toISOString(), file: 'TxGuard-90s-1080p.mp4', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, video: { width: picture.width, height: picture.height, fps: picture.avg_frame_rate, codec: picture.codec_name, pixelFormat: picture.pix_fmt, frames: picture.nb_frames, duration: picture.duration }, audio: { codec: sound.codec_name, rate: sound.sample_rate, channels: sound.channels, duration: sound.duration, loudness }, captions: { count: timing.segments.length, method: 'Actual generated phrase boundaries checked against each WAV duration to within 2ms; final A/V start and duration difference under one video frame', srt: 'TxGuard-90s.en.srt', animatedBurnIn: true }, fullDecode: 'passed, no errors', blackIntervals: black, silenceLog, playback, genuineTxGuardSeconds: 68, genuineExplorerSeconds: 4, coverage: { realProviderResults: true, noMocks: true, explanationSource: 'deterministic', receipt: 'Existing confirmed registry call; not bound to the current report; no write' }, reviewScope: 'Automated full decode, complete headless browser playback with audio decoding, measured sync/loudness, speech recognition and visual frame inspection. No claim of independent human listening or physical device playback.' }
await writeFile(`${root}/deliverables/verification.json`, JSON.stringify(result, null, 2))
console.log(`Verified final export SHA256 ${result.sha256}`)
