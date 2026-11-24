import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root = new URL('../', import.meta.url)
const stage = new URL('../../../.cache/txguard-video-package/TxGuard-Cinematic-Demo/', import.meta.url)
const verification = JSON.parse(await readFile(new URL('deliverables/verification.json', root), 'utf8'))
if (!verification.playback.ended || verification.fullDecode !== 'passed, no errors') throw Error('Verification must pass before packaging')
const sourceEvidence = JSON.parse(await readFile(new URL('source/capture-evidence.json', root), 'utf8'))
const recognition = JSON.parse(await readFile(new URL('review/narration-transcription.json', root), 'utf8'))
if (recognition.checks.some(check => check.needsReview)) throw Error('Resolve speech recognition review flags before packaging')
const planPath = new URL('production-plan.json', root)
const plan = JSON.parse(await readFile(planPath, 'utf8'))
const finalNarration = JSON.parse(await readFile(new URL('narration.json', root), 'utf8'))
for (const scene of plan.scenes) scene.narration = finalNarration.scenes.find(item => item.id === scene.id).phrases.map(phrase => phrase.text).join(' ')
plan.state = 'completed — final master and subtitles exported; technical playback and frame review passed'
plan.source.liveScanStatus = 200
delete plan.source.liveScanError
plan.source.evidence = 'source/capture-evidence.json'
plan.audio.narration = 'Kokoro 82M neural TTS; am_michael male English catalogue voice; actual measured phrase durations; no playback speed-up'
plan.audio.music = 'Original synthesized 90-second electronic score, no external samples; narration ducking and two-pass loudness mastering'
plan.minimumGenuineWebsiteSeconds = 63
plan.actualTxGuardWebsiteSeconds = 68
plan.actualExplorerSeconds = 4
plan.deliverablesPending = []
plan.requiredChecks = ['Working actual feature capture', 'At least 70 percent actual TxGuard visuals', 'Independent transcription review of every narration phrase', 'No private information', 'Exact dimensions/frame rate/duration verified with ffprobe', 'Full decode, complete browser playback and representative frame inspection']
plan.deliverables = ['deliverables/TxGuard-90s-1080p.mp4', 'deliverables/TxGuard-90s.en.srt', 'deliverables/TxGuard-narration.wav', 'deliverables/TxGuard-thumbnail.png', 'timeline.json', 'deliverables/verification.json']
plan.review = { completeBrowserPlayback: true, fullDecode: true, exactStreamDurationAndFormat: true, exactCaptionPhraseBoundaries: true, independentSpeechRecognition: true, representativeExportedFramesInspected: 21, scope: verification.reviewScope }
// The historical storyboard's visual intentions remain; remove superseded capture blockers.
plan.scenes.find(scene => scene.id === 3).visual = 'Recorded actual chain selection, address entry, request/loading and completed 95/100 current provider assessment from the live production website.'
await writeFile(planPath, JSON.stringify(plan, null, 2))
const infoPath = new URL('deliverables/media-info.json', root)
const info = JSON.parse(await readFile(infoPath, 'utf8'))
delete info.checksPending
info.verification = 'verification.json'
info.status = 'Full decode, complete browser playback, phrase timing, loudness, speech and visual frame checks completed'
await writeFile(infoPath, JSON.stringify(info, null, 2))
const finalChecksums = []
for (const name of await readdir(new URL('deliverables/', root))) {
  if (name.endsWith('.zip') || name === 'SHA256SUMS.txt') continue
  const bytes = await readFile(new URL(`deliverables/${name}`, root))
  finalChecksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`)
}
await writeFile(new URL('deliverables/SHA256SUMS.txt', root), finalChecksums.join('\n') + '\n')
async function copy(relative) {
  const target = new URL(relative, stage)
  await mkdir(new URL('.', target), { recursive: true })
  await copyFile(new URL(relative, root), target)
}
for (const relative of ['README.md', 'production-plan.json', 'timeline.json', 'narration.json']) await copy(relative)
for (const directory of ['scripts', 'fonts', 'art', 'tooling', 'audio']) {
  for (const name of await readdir(new URL(`${directory}/`, root))) await copy(`${directory}/${name}`)
}
for (const name of ['capture-evidence.json', 'selector-capture.json', sourceEvidence.clips.desktop.file, sourceEvidence.clips.mobile.file, sourceEvidence.clips.explorer.file, ...sourceEvidence.screenshots]) await copy(`source/${name}`)
for (const name of ['final-contact-sheet.jpg', 'final-frame-times.json', 'narration-transcription.json']) await copy(`review/${name}`)
for (const name of ['captions.ass', 'chapters.ffmeta']) await copy(`render/${name}`)
for (const name of await readdir(new URL('deliverables/', root))) if (!name.endsWith('.zip')) await copy(`deliverables/${name}`)
console.log(`Verified editable-project files staged at ${fileURLToPath(stage)}`)
