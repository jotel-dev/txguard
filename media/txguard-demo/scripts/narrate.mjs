import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
const require = createRequire(new URL('../../../.cache/video-tools/package.json', import.meta.url))
const { KokoroTTS } = await import(pathToFileURL(require.resolve('kokoro-js')).href)
const root = fileURLToPath(new URL('../', import.meta.url))
// The runtime's model cache remains inside the ignored .cache/video-tools directory.
const ffmpeg = require('ffmpeg-static')
const ffprobe = require('ffprobe-static').path
await mkdir(`${root}/audio`, { recursive: true })
const script = JSON.parse(await readFile(`${root}/narration.json`, 'utf8'))
const onlyScene = Number(process.argv.find(arg => arg.startsWith('--scene='))?.split('=')[1]) || null
console.log('Loading licensed Kokoro neural speech model on CPU')
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
const voices = tts.list_voices()
console.log('Voice catalogue inspected; using am_michael male English voice')
const segments = []
for (const scene of script.scenes) {
  let cursor = scene.start + scene.lead
  for (let i = 0; i < scene.phrases.length; i++) {
    const phrase = scene.phrases[i]
    const base = `scene-${scene.id}-${i + 1}`
    if (!onlyScene || onlyScene === scene.id) {
      const audio = await tts.generate(phrase.spoken || phrase.text, { voice: script.voice, speed: .94 })
      await audio.save(`${root}/audio/${base}-raw.wav`)
      const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${root}/audio/${base}-raw.wav`, '-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB,areverse', '-ar', '48000', '-ac', '1', `${root}/audio/${base}.wav`], { encoding: 'utf8', windowsHide: true })
      if (result.status !== 0) throw Error(result.stderr)
    }
    const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', `${root}/audio/${base}.wav`], { encoding: 'utf8', windowsHide: true })
    const duration = Number(JSON.parse(probe.stdout).format.duration)
    segments.push({ scene: scene.id, text: phrase.text, spoken: phrase.spoken || phrase.text, start: cursor, end: cursor + duration, duration, file: `audio/${base}.wav` })
    cursor += duration + .25
    console.log(`${base}: ${duration.toFixed(2)}s; scene speech ends ${(cursor - .25).toFixed(2)}s / ${scene.end}s`)
  }
  if (cursor - .25 > scene.end - .2) throw Error(`Scene ${scene.id} narration is too long; shorten wording or regenerate naturally, never rush playback.`)
}
await writeFile(`${root}/audio/timing.json`, JSON.stringify({ engine: script.engine, voice: script.voice, speed: .94, method: 'Measured generated phrase audio boundaries, not estimated word timing', segments }, null, 2))
console.log(`Generated ${segments.length} naturally paced phrases with exact audio boundaries`)
