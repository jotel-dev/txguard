import { guard } from '../server/http.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST', 10)) return
  if (typeof req.body.text !== 'string' || !req.body.text.trim() || req.body.text.length > 200)
    return res.status(400).json({ error: 'Text must contain 1-200 characters.' })
  try {
    const response = await fetch(
      `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(req.body.text)}`,
      { redirect: 'error', signal: AbortSignal.timeout(5000) },
    )
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/'))
      throw new Error('Unavailable')
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 250000) throw new Error('Too large')
    res.setHeader('Content-Type', 'audio/mpeg')
    return res.status(200).send(Buffer.from(bytes))
  } catch {
    return res.status(503).json({ error: 'Speech audio unavailable. Use your device reader.' })
  }
}
