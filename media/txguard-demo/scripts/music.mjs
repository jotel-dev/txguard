import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
await mkdir(`${root}/audio`, { recursive: true })
const sampleRate = 48000, duration = 90, count = sampleRate * duration
const output = Buffer.alloc(44 + count * 4)
output.write('RIFF', 0); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8)
output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22)
output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 4, 28)
output.writeUInt16LE(4, 32); output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(count * 4, 40)
const chords = [[220, 261.6256, 329.6276, 493.8833], [174.6141, 220, 261.6256, 329.6276], [130.8128, 195.9977, 246.9417, 329.6276], [195.9977, 246.9417, 293.6648, 329.6276]]
const bass = [55, 43.6535, 65.4064, 48.9994]
const beat = 60 / 90, chordLength = beat * 16, tau = Math.PI * 2
let state = 0x4a6f7465, previousNoise = 0
const smooth = x => { const value = Math.max(0, Math.min(1, x)); return value * value * (3 - 2 * value) }
for (let i = 0; i < count; i++) {
  const t = i / sampleRate
  const ci = Math.floor(t / chordLength) % 4
  const local = t % chordLength
  const cross = smooth(Math.min(local / 1.4, (chordLength - local) / 1.4))
  const envelope = smooth(t / 3.5) * smooth((duration - t) / 2.5)
  let left = 0, right = 0
  for (let j = 0; j < 4; j++) {
    const f = chords[ci][j]
    const drift = .89 + .11 * Math.sin(t * .31 + j)
    left += (.72 * Math.sin(tau * f * t + j) + .18 * Math.sin(tau * f * 2.001 * t + j)) * .022 * drift * cross
    right += (.72 * Math.sin(tau * f * 1.0008 * t + j + .12) + .18 * Math.sin(tau * f * 1.999 * t + j)) * .022 * drift * cross
  }
  const beatPosition = t % beat
  const bassTone = Math.sin(tau * bass[ci] * t) * Math.exp(-beatPosition * 5.5) * .045
  const step = Math.floor(t / (beat / 2))
  const pluckPosition = t % (beat / 2)
  const pluck = Math.sin(tau * chords[ci][[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] * 2 * t) * Math.exp(-pluckPosition * 15) * .021 * smooth((t - 10) / 8)
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0
  const noise = state / 2147483648 - 1
  const hat = (noise - previousNoise) * Math.exp(-pluckPosition * 100) * .005 * smooth((t - 20) / 8)
  previousNoise = noise
  const kickPhase = beatPosition * (57 + 37 * Math.exp(-beatPosition * 25))
  const kick = Math.sin(tau * kickPhase) * Math.exp(-beatPosition * 24) * .025 * smooth((t - 12) / 9)
  let fx = 0
  for (const time of [11.7, 22.8, 39.8, 54.8, 64.8, 75.8, 83.8]) {
    const offset = t - time
    if (offset > -.32 && offset < .9) fx += noise * .008 * Math.exp(-Math.pow(offset / .24, 2))
  }
  const ending = t - 84.5
  const bell = ending > 0 ? (.018 * Math.sin(tau * 440 * ending) + .009 * Math.sin(tau * 659.255 * ending)) * Math.exp(-ending * .85) : 0
  left = (left + bassTone + pluck + hat + kick + fx + bell) * envelope
  right = (right + bassTone + pluck * .87 + hat * .8 + kick + fx * .85 + bell) * envelope
  output.writeInt16LE(Math.round(Math.max(-.95, Math.min(.95, left)) * 32767), 44 + i * 4)
  output.writeInt16LE(Math.round(Math.max(-.95, Math.min(.95, right)) * 32767), 46 + i * 4)
}
await writeFile(`${root}/audio/original-score.wav`, output)
await writeFile(`${root}/audio/music-provenance.json`, JSON.stringify({ title: 'Before Funds Move', author: 'Original procedural composition created for the TxGuard demo', method: 'Deterministic synthesized pads, bass, arpeggio, percussion, transitions and end chime; no third-party recordings or samples', sampleRate, duration, tempo: 90, permission: 'Created for this project; no third-party music attribution or stock license required' }, null, 2))
console.log('Original 90-second stereo cinematic electronic score generated; no external samples')
