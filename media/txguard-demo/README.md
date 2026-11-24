# TxGuard — cinematic hackathon demo

This is the editable production package for the 90-second, 1920×1080, 30 FPS TxGuard demo. The application itself is unchanged. Captures use the public production website, not a local or mocked application.

## Delivered assets

- `deliverables/TxGuard-90s-1080p.mp4`: H.264/yuv420p picture, stereo AAC audio, animated burned-in English captions and eight embedded chapters.
- `deliverables/TxGuard-90s.en.srt`: separate English subtitles; source phrase timing is in `audio/timing.json`.
- `deliverables/TxGuard-narration.wav`: separate male AI narration, placed on the same 90-second timeline.
- `deliverables/TxGuard-thumbnail.png`: 1080p thumbnail using the genuine homepage capture.
- `deliverables/verification.json`: exact stream, duration, decode, browser playback, audio and timing results.
- `timeline.json`, `narration.json`, `scripts/`, `source/`, `audio/`, `art/`, `fonts/`: editable sources. This is a JSON timeline and Node/FFmpeg production project for the TxGuard repository, rather than a proprietary Premiere/Resolve project.

## What the footage establishes

The recorded production scan returned HTTP 200, a 95/100 **High risk** severity index and provider-reported indicators for the documented public example address. These are the site's actual results at capture time, not an invented score or a claim about all addresses. Actual Etherscan transaction history, two locally saved scanned addresses, all five real network selector values and a mobile report were captured. See `source/capture-evidence.json` and `source/selector-capture.json`.

The explanation endpoint returned its **deterministic** grounded fallback. The video labels this explicitly and does not claim an authenticated AI inference succeeded. The narration itself is genuinely synthesized using the Kokoro neural speech model and the catalogue's male English Michael voice; no person's voice was cloned.

Read-only receipt verification returned a confirmed existing registry call. The film labels it an existing public assertion, not certification of its score and not a receipt bound to the report currently shown. The verified transaction is `0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082`. The independent Stacks explorer page is also a genuine capture. No wallet signing, payment or new mainnet write occurred.

The timeline contains **68 seconds of actual TxGuard website visuals** (75.6%), four seconds of the actual explorer and 18 seconds of original graphics. UI pixels and provider response bodies were not rewritten. Cropping, camera zooms, framing, a visible cursor, highlights, fades and captions are editorial treatments. The abstract opening transfer is labeled illustrative and moves no funds.

## Sound, captions and provenance

`audio/original-score.wav` is an original deterministic synthesized electronic score: pads, bass, arpeggio, restrained percussion, transition swells and an ending chime. It contains no downloaded music or third-party samples. See `audio/music-provenance.json`. The mix ducks music under speech and uses measured two-pass loudness mastering.

Each narration phrase was generated and measured separately. Only leading/trailing silence was trimmed; interior speech pauses were preserved and no playback speed-up was applied. The neural speech rate was slightly slower than its default. Caption boundaries are derived from those actual WAV durations, rather than word-count estimates. The SRT uses standard spelling; pronunciation aliases such as “T X Guard,” “B N B” and “main net” have the same intended spoken names.

The independent Whisper speech-recognition pass checks the real generated audio. Its transcript is a review aid; minor punctuation, hyphenation, homophones and proper-name transcription variants are documented instead of being treated as new spoken content. Visual inspection and technical playback checks are recorded separately. No independent human listening, native Safari or physical-device playback certification is claimed.

Typography uses the existing project's Manrope and Space Grotesk families, obtained from the official Google Fonts repository. Both SIL Open Font Licenses accompany the font files. The neural model is [Kokoro 82M](https://huggingface.co/hexgrad/Kokoro-82M), distributed with Apache-licensed weights; its JavaScript runtime is [the upstream Kokoro project](https://github.com/hexgrad/kokoro/tree/main/kokoro.js). Build tools/model weights are not bundled into the editable project archive.

## Reproduce or edit

The production scripts expect the repository layout and an isolated tool installation under `.cache/video-tools`. They use the existing Playwright dependency in `web/` for capture and artwork, plus `kokoro-js`, `ffmpeg-static`, `ffprobe-static` and the transitive Transformers.js/Sharp dependencies. Package versions are locked in the included tool manifest/lockfile. Install the matching dependencies into that ignored cache; do not modify the production application's dependency tree.

```powershell
New-Item -ItemType Directory -Path .cache/video-tools -Force
Copy-Item media/txguard-demo/tooling/package*.json .cache/video-tools/
npm.cmd ci --prefix .cache/video-tools
node media/txguard-demo/scripts/capture.mjs
node media/txguard-demo/scripts/recapture-chains.mjs
node media/txguard-demo/scripts/artwork.mjs
node media/txguard-demo/scripts/music.mjs
node media/txguard-demo/scripts/narrate.mjs
node media/txguard-demo/scripts/render.mjs --all
node media/txguard-demo/scripts/check-narration.mjs
node media/txguard-demo/scripts/verify.mjs
node media/txguard-demo/scripts/inspect-frames.mjs --final
```

Capture requires a functioning live website and providers. The default browser is installed Microsoft Edge; modify the launch channel if using another supported local browser. Model download requires network access on the first run. To refine only one narration scene, use `narrate.mjs --scene=6`; other existing phrase WAVs are retained. To refresh only the selector shots, use `render.mjs --picture --only-chains`. Preserve genuine results and disclosures when editing.

The ZIP is private delivery material. Nothing in this video workflow publishes to a video service, pushes repository changes, changes server secrets or redeploys the app.
