import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const require = createRequire(new URL('../../../.cache/video-tools/package.json', import.meta.url))
const ffmpeg = require('ffmpeg-static'), ffprobe = require('ffprobe-static').path
const root = fileURLToPath(new URL('../', import.meta.url))
for (const directory of ['render', 'render/text', 'deliverables']) await mkdir(`${root}/${directory}`, { recursive: true })
function run(args, label = '') {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-y', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 20e6 })
  if (result.status !== 0) throw Error(`${label}: ${result.stderr.slice(-9000)}`)
  return result.stderr
}
const evidence = JSON.parse(await readFile(`${root}/source/capture-evidence.json`, 'utf8'))
if (!evidence.complete || !evidence.noMocks || !evidence.receiptText?.startsWith('Confirmed registry call')) throw Error('Complete genuine capture and verified receipt are required')
const desktop = evidence.clips.desktop, m = desktop.markers
const shots = [
  { name: 'problem-a', start: 0, duration: 4, scene: 1, art: 'intro-a' },
  { name: 'problem-b', start: 4, duration: 4, scene: 1, art: 'intro-b' },
  { name: 'problem-c', start: 8, duration: 4, scene: 1, art: 'intro-c' },
  { name: 'homepage', start: 12, duration: 11, scene: 2, image: 'desktop-home.png', crop: false, heading: '02 / KNOW BEFORE YOU SEND' },
  { name: 'scan', start: 23, duration: 17, scene: 3, video: desktop.file, seek: m.scanStart, heading: '03 / CHOOSE. ENTER. CHECK.', scan: true },
  { name: 'report', start: 40, duration: 3, scene: 4, video: desktop.file, seek: m.report + .3, heading: '04 / REAL DATA. CLEAR EXPLANATIONS.' },
  { name: 'signals', start: 43, duration: 3, scene: 4, video: desktop.file, seek: m.signals + .3, heading: '04 / REVIEW THE SECURITY FINDINGS' },
  { name: 'explanation', start: 46, duration: 3, scene: 4, video: desktop.file, seek: m.explanation + .3, heading: '04 / UNDERSTAND THE EVIDENCE', note: 'DETERMINISTIC EXPLANATION SHOWN' },
  { name: 'history', start: 49, duration: 3, scene: 4, video: desktop.file, seek: m.history + .3, heading: '04 / INSPECT ACTUAL TRANSACTIONS' },
  { name: 'dashboard', start: 52, duration: 3, scene: 4, video: desktop.file, seek: m.dashboard + .3, heading: '04 / YOUR MULTI-WALLET WATCHLIST', crop: false, note: 'SAVED ON THIS DEVICE' },
  ...['ethereum', 'bnb', 'solana', 'bitcoin', 'stacks'].map((chain, i) => ({ name: `chain-${chain}`, start: 55 + i * 2, duration: 2, scene: 5, image: `chain-${chain}.png`, heading: '05 / FIVE NETWORKS. ONE PLACE TO CHECK.', note: 'ETH/BNB SECURITY · OTHER NETWORKS LIMITED' })),
  { name: 'receipt', start: 65, duration: 7, scene: 6, image: 'desktop-receipt.png', heading: '06 / AN EXISTING STACKS MAINNET RECORD', note: 'PUBLIC ASSERTION · NOT SECURITY CERTIFICATION' },
  { name: 'explorer', start: 72, duration: 4, scene: 6, image: 'stacks-explorer.png', crop: false, heading: '06 / INDEPENDENTLY INSPECT THE RECEIPT', note: 'EXISTING RECORD · NO NEW MAINNET WRITE' },
  { name: 'mobile-home', start: 76, duration: 4, scene: 7, mobile: true, video: evidence.clips.mobile.file, seek: evidence.clips.mobile.home + .2 },
  { name: 'mobile-report', start: 80, duration: 4, scene: 7, mobile: true, video: evidence.clips.mobile.file, seek: evidence.clips.mobile.report + .2 },
  { name: 'outro', start: 84, duration: 6, scene: 8, art: 'outro' },
]
if (shots.reduce((sum, shot) => sum + shot.duration, 0) !== 90) throw Error('Timeline must be exactly 90 seconds')
await writeFile(`${root}/timeline.json`, JSON.stringify({ width: 1920, height: 1080, fps: 30, duration: 90, source: evidence.origin, genuineTxGuardSeconds: 68, genuineExplorerSeconds: 4, originalGraphicsSeconds: 18, sourceCapture: 'source/capture-evidence.json', shots }, null, 2))
if (process.argv.includes('--picture') || process.argv.includes('--all')) {
  for (const shot of shots) {
    if (process.argv.includes('--only-chains') && !shot.name.startsWith('chain-')) continue
    const output = `render/${shot.name}.mp4`
    const inputs = ['-loop', '1', '-framerate', '30', '-i', `art/${shot.mobile ? 'mobile' : 'background'}.png`]
    let filter
    if (shot.art) {
      inputs.push('-loop', '1', '-framerate', '30', '-i', `art/${shot.art}.png`)
      const z = shot.art === 'outro' ? 1.012 : 1.018
      filter = `[1:v]zoompan=z='1+(${z}-1)*on/${shot.duration * 30}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,format=rgba,fade=t=in:d=.24:alpha=1,fade=t=out:st=${shot.duration - .24}:d=.24:alpha=1[art];[0:v][art]overlay=shortest=1,format=yuv420p[v]`
      if (shot.art === 'outro') filter = filter.replace(',format=yuv420p[v]', ',fade=t=out:st=5.1:d=.9,format=yuv420p[v]')
    } else {
      if (shot.video) inputs.push('-ss', String(shot.seek), '-i', `source/${shot.video}`)
      else inputs.push('-loop', '1', '-framerate', '30', '-i', `source/${shot.image}`)
      if (shot.mobile) {
        filter = `[1:v]setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${shot.duration},scale=390:844,setsar=1,format=rgba,fade=t=in:d=.25:alpha=1,fade=t=out:st=${shot.duration - .2}:d=.2:alpha=1[ui];[0:v][ui]overlay=x=1203:y=82:shortest=1,format=yuv420p[v]`
      } else {
        const crop = shot.crop === false ? '' : 'crop=1280:640:160:80,'
        const motion = shot.image ? `zoompan=z='1+0.012*on/${shot.duration * 30}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1728x864:fps=30,` : 'scale=1728:864:flags=lanczos,'
        await writeFile(`${root}/render/text/${shot.name}-heading.txt`, shot.heading)
        await writeFile(`${root}/render/text/${shot.name}-note.txt`, shot.note || 'GENUINE WEBSITE CAPTURE')
        filter = `[1:v]setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${shot.duration},${crop}${motion}setsar=1,format=rgba,fade=t=in:d=.22:alpha=1,fade=t=out:st=${shot.duration - .18}:d=.18:alpha=1[ui];[0:v]drawbox=x=92:y=68:w=1736:h=872:color=0x648abb@0.35:t=2[bg];[bg][ui]overlay=x=96:y=72:shortest=1,drawtext=fontfile=fonts/SpaceGrotesk.ttf:textfile=render/text/${shot.name}-heading.txt:fontcolor=0xc4d7f3:fontsize=24:x=96:y=27,drawtext=fontfile=fonts/Manrope.ttf:textfile=render/text/${shot.name}-note.txt:fontcolor=0x89a7cc:fontsize=16:x=w-tw-96:y=32,format=yuv420p[base]`
        if (shot.scan) {
          const from = Math.max(0, m.scanClick - m.scanStart), to = Math.max(from + .2, m.report - m.scanStart - 1)
          filter += `;color=c=0x6eafff@0.26:s=1728x3:r=30:d=${shot.duration},format=rgba[line];[base][line]overlay=x=96:y='74+mod(t*160,854)':enable='between(t,${from.toFixed(3)},${to.toFixed(3)})',format=yuv420p[v]`
        } else filter += ';[base]null[v]'
      }
    }
    filter = filter.replace(/([=:])\.(\d)/g, (_, separator, digit) => `${separator}0.${digit}`)
    run(['-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[v]', '-an', '-frames:v', String(shot.duration * 30), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-threads', '4', '-pix_fmt', 'yuv420p', '-video_track_timescale', '15360', output], shot.name)
    console.log(`Rendered ${shot.name}: ${shot.start}–${shot.start + shot.duration}s`)
  }
  await writeFile(`${root}/render/concat.txt`, shots.map(shot => `file '${shot.name}.mp4'`).join('\n'))
  run(['-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'render/concat.txt', '-c', 'copy', '-movflags', '+faststart', 'render/picture.mp4'], 'join picture')
  console.log('Exact 90-second picture edit assembled')
}
if (process.argv.includes('--finish') || process.argv.includes('--all')) {
  const timing = JSON.parse(await readFile(`${root}/audio/timing.json`, 'utf8'))
  const segments = timing.segments
  const formatTime = (t, separator = ',') => { const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}` }
  const assTime = t => `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}.${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`
  const wrap = text => { const words = text.split(' '), lines = []; let line = ''; for (const word of words) { if ((line + ' ' + word).trim().length > 64) { lines.push(line); line = word } else line = (line + ' ' + word).trim() } if (line) lines.push(line); return lines.join('\n') }
  const srt = segments.map((segment, index) => `${index + 1}\n${formatTime(segment.start)} --> ${formatTime(segment.end)}\n${wrap(segment.text)}\n`).join('\n')
  await writeFile(`${root}/deliverables/TxGuard-90s.en.srt`, srt)
  const assHeader = '[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Manrope,42,&H00FFFFFF,&H00FFB27D,&H00301409,&H80000000,0,0,0,0,100,100,0,0,1,0,1.5,2,150,150,30,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
  const events = segments.map(segment => {
    const text = wrap(segment.text).replace(/\n/g, '\\N').replace(/TxGuard/g, '{\\c&HFFB27D&}TxGuard{\\c&HFFFFFF&}')
    return `Dialogue: 0,${assTime(segment.start)},${assTime(segment.end)},Caption,,0,0,0,,{\\fad(120,100)\\an2\\move(960,1060,960,1050,0,180)}${text}`
  }).join('\n')
  await writeFile(`${root}/render/captions.ass`, assHeader + events + '\n')
  const voiceInputs = segments.flatMap(segment => ['-i', segment.file])
  const delayed = segments.map((segment, i) => `[${i}:a]adelay=delays=${Math.round(segment.start * 1000)}:all=1[a${i}]`).join(';')
  const join = segments.map((_, i) => `[a${i}]`).join('')
  run(['-loglevel', 'error', ...voiceInputs, '-filter_complex', `${delayed};${join}amix=inputs=${segments.length}:duration=longest:normalize=0,apad,atrim=duration=90,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000[out]`, '-map', '[out]', '-ac', '1', '-c:a', 'pcm_s16le', 'deliverables/TxGuard-narration.wav'], 'assemble voice')
  run(['-loglevel', 'error', '-i', 'deliverables/TxGuard-narration.wav', '-i', 'audio/original-score.wav', '-filter_complex', '[0:a]asplit=2[voice][side];[1:a]loudnorm=I=-29:TP=-9:LRA=6,aresample=48000[music];[music][side]sidechaincompress=threshold=0.04:ratio=4:attack=20:release=350:makeup=1[ducked];[voice][ducked]amix=inputs=2:duration=longest:normalize=0,afade=t=in:d=0.25,afade=t=out:st=89:d=1,atrim=duration=90[out]', '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', 'render/mix.wav'], 'duck soundtrack')
  const analysis = run(['-i', 'render/mix.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json', '-f', 'null', '-'], 'measure loudness')
  const measured = JSON.parse(analysis.match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1))
  const mastering = `loudnorm=I=-16:TP=-1.5:LRA=8:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,aresample=48000`
  const titles = ['The problem', 'Introducing TxGuard', 'The scanning experience', 'Understand the evidence', 'Five networks', 'Existing Stacks Mainnet record', 'Everyday impact', 'Know Before You Send']
  const boundaries = [0, 12, 23, 40, 55, 65, 76, 84, 90]
  await writeFile(`${root}/render/chapters.ffmeta`, ';FFMETADATA1\ntitle=TxGuard — Know Before You Send\ncomment=Genuine production website capture. Existing Stacks record is not bound to the current report.\n' + titles.map((title, i) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${boundaries[i] * 1000}\nEND=${boundaries[i + 1] * 1000}\ntitle=${title}\n`).join(''))
  run(['-loglevel', 'error', '-i', 'render/picture.mp4', '-i', 'render/mix.wav', '-i', 'render/chapters.ffmeta', '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '2', '-map_chapters', '2', '-vf', 'ass=filename=render/captions.ass:fontsdir=fonts', '-af', mastering, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '4', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', '90', '-movflags', '+faststart', 'deliverables/TxGuard-90s-1080p.mp4'], 'final captioned master')
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-show_chapters', '-of', 'json', 'deliverables/TxGuard-90s-1080p.mp4'], { cwd: root, encoding: 'utf8', windowsHide: true })
  const media = JSON.parse(probe.stdout)
  await writeFile(`${root}/deliverables/media-info.json`, JSON.stringify({ ...media, captions: segments.length, measuredBeforeMaster: measured, genuineTxGuardSeconds: 68, genuineExplorerSeconds: 4, checksPending: 'Full decode, browser playback, caption boundaries and frame review' }, null, 2))
  console.log(`Exported final MP4 (${(Number(media.format.size) / 1e6).toFixed(2)} MB), standalone SRT and narration`)
}
