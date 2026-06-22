export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const text = req.method === 'POST' ? req.body?.text : req.query?.text;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required.' });
  }

  try {
    // Google Translate TTS url (supports max 200 chars, client will chunk if necessary)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
    const response = await fetch(ttsUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch TTS from source: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('TTS generation failed:', err);
    return res.status(500).json({ error: 'TTS generation failed: ' + err.message });
  }
}
