import { getWalletData } from '../src/blockchain.js';
import { calculateRisk } from '../src/riskEngine.js';

async function callGroq(prompt, jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${apiKey}` 
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are TxGuard, a blockchain security intelligence AI. Always respond with valid JSON only, no markdown, no extra text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 1200,
      ...(jsonMode && { response_format: { type: 'json_object' } })
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

function parseAnalysis(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  try { const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) return JSON.parse(m[1].trim()); } catch {}
  try { const m = raw.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  try { const s = raw.indexOf('{'), e = raw.lastIndexOf('}'); if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1)); } catch {}
  return null;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, chain } = req.body;

  if (!wallet || !chain) {
    return res.status(400).json({ error: 'Wallet and chain parameters are required.' });
  }

  // ── Run Risk Engine & Blockchain Scan ──
  try {
    let onchainData = null;
    try { onchainData = await getWalletData(wallet, chain); } catch (e) { console.warn('Backend getWalletData failed:', e); }

    let riskEngineResult = null;
    try { riskEngineResult = await calculateRisk(wallet, chain, onchainData); } catch (e) { console.warn('Backend calculateRisk failed:', e); }

    if (!onchainData || !riskEngineResult) {
      return res.status(500).json({ error: 'Backend systems failed to fetch wallet data or calculate risk.' });
    }

    const chainName = chain === 'bnb' ? 'BNB Chain' : chain.charAt(0).toUpperCase() + chain.slice(1);
    const dataContext = onchainData
      ? `LIVE BLOCKCHAIN DATA:\n- Balance: ${onchainData.balance}\n- Total Transactions: ${onchainData.totalTransactions}\n- Wallet Age: ${onchainData.walletAge}\n- Categories: ${JSON.stringify(onchainData.categories)}`
      : `LIVE BLOCKCHAIN DATA: Could not fetch live data, use your best security assessment.`;

    const prompt = `You are TxGuard, a blockchain security AI. Analyze this wallet.
Wallet: ${wallet}
Chain: ${chainName}
${dataContext}

Respond ONLY with valid JSON:
{
  "riskScore": <0-100>,
  "riskLabel": "<Safe|Caution|Suspicious|Dangerous>",
  "walletAge": "${onchainData?.walletAge || 'Unknown'}",
  "totalTransactions": "${onchainData?.totalTransactions || 'Unknown'}",
  "balance": "${onchainData?.balance || 'Unable to verify'}",
  "summary": "<2-3 sentence plain English summary>",
  "alerts": [{ "type": "<warn|danger|info|safe>", "title": "<title>", "text": "<detail>" }],
  "categories": ${onchainData?.categories ? JSON.stringify(onchainData.categories) : '[{"name":"Transfers","count":0,"percentage":0}]'},
  "recommendations": ["<recommendation>"]
}
Rules: 0-25=Safe, 26-50=Caution, 51-75=Suspicious, 76-100=Dangerous. Include 3-5 alerts and 3-4 recommendations.`;

    const raw = await callGroq(prompt, true);
    const parsed = parseAnalysis(raw);

    const merge = (p) => {
      if (onchainData) { p.balance = onchainData.balance; p.totalTransactions = onchainData.totalTransactions; p.walletAge = onchainData.walletAge; p.categories = onchainData.categories; }
      if (riskEngineResult) { p.riskScore = riskEngineResult.riskScore; p.riskLabel = riskEngineResult.riskLabel; if (riskEngineResult.alerts.length > 0) p.alerts = riskEngineResult.alerts; }
      return p;
    };

    if (parsed) {
      return res.status(200).json(merge(parsed));
    } else {
      const raw2 = await callGroq(prompt, false);
      const parsed2 = parseAnalysis(raw2);
      if (parsed2) {
        return res.status(200).json(merge(parsed2));
      } else {
        return res.status(500).json({ error: 'Could not parse AI response.' });
      }
    }

  } catch (err) {
    console.error('Scan processing error:', err);
    return res.status(500).json({ error: 'Scan processing failed: ' + err.message });
  }
}
