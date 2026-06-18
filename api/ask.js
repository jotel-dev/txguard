const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${GROQ_API_KEY}` 
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are TxGuard AI. Answer the user\'s question about the wallet analysis in 2-4 sentences.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 400
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, chain, riskScore, riskLabel, summary, question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question parameter is required.' });
  }

  const prompt = `Wallet: ${wallet}, Chain: ${chain}, Risk: ${riskScore}/100 (${riskLabel}), Summary: ${summary}. User asks: "${question.trim()}".`;

  try {
    const answer = await callGroq(prompt);
    return res.status(200).json({ answer });
  } catch (e) {
    console.error('Ask failed:', e);
    return res.status(500).json({ error: e.message || 'Failed to get answer' });
  }
}
