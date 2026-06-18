import { useState } from 'react'
import './App.css'
import { getWalletData } from './blockchain'
import { calculateRisk } from './riskEngine'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum', placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
  { id: 'bnb', label: 'BNB', placeholder: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
  { id: 'solana', label: 'Solana', placeholder: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm' },
  { id: 'bitcoin', label: 'Bitcoin', placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { id: 'celo', label: 'Celo', placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
]

const SAMPLE_WALLETS = {
  ethereum: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e',
  bnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  solana: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm',
  bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
}

async function callGroq(prompt, jsonMode = false) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
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
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || ''
}

function parseAnalysis(raw) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { }
  try {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (m) return JSON.parse(m[1].trim())
  } catch { }
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch { }
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) return JSON.parse(raw.slice(start, end + 1))
  } catch { }
  return null
}

function getRiskClass(score) {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'danger'
  return 'critical'
}

function getRiskLabel(score) {
  if (score <= 25) return 'Safe'
  if (score <= 50) return 'Caution'
  if (score <= 75) return 'Suspicious'
  return 'Dangerous'
}

function getAlertDotClass(type) {
  if (type === 'safe') return 'safe'
  if (type === 'warn') return 'warn'
  if (type === 'danger') return 'danger'
  if (type === 'info') return 'info'
  return 'info'
}

export default function App() {
  const [chain, setChain] = useState('ethereum')
  const [wallet, setWallet] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [asking, setAsking] = useState(false)

  const selectedChain = CHAINS.find(c => c.id === chain)

  async function analyze() {
    if (!wallet.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    setAnswer('')

    let onchainData = null
    try {
      onchainData = await getWalletData(wallet.trim(), chain)
    } catch (e) {
      console.warn('Blockchain fetch failed:', e)
    }

    let riskEngineResult = null
    try {
      riskEngineResult = await calculateRisk(wallet.trim(), chain, onchainData)
    } catch (e) {
      console.warn('Risk engine failed:', e)
    }

    const chainName = chain === 'bnb' ? 'BNB Chain' : chain.charAt(0).toUpperCase() + chain.slice(1)
    const dataContext = onchainData ? `
LIVE BLOCKCHAIN DATA:
- Balance: ${onchainData.balance}
- Total Transactions: ${onchainData.totalTransactions}
- Wallet Age: ${onchainData.walletAge}
- Recent transaction categories: ${JSON.stringify(onchainData.categories)}
` : `LIVE BLOCKCHAIN DATA: Could not fetch live data, use your best security assessment.`

    const prompt = `You are TxGuard, a blockchain security intelligence AI. Analyze this wallet using the live data provided.

Wallet: ${wallet.trim()}
Chain: ${chainName}
${dataContext}

Respond ONLY with a valid JSON object:
{
  "riskScore": <number 0-100>,
  "riskLabel": "<Safe | Caution | Suspicious | Dangerous>",
  "walletAge": "${onchainData?.walletAge || 'Unknown'}",
  "totalTransactions": "${onchainData?.totalTransactions || 'Unknown'}",
  "balance": "${onchainData?.balance || 'Unable to verify'}",
  "summary": "<2-3 sentence plain English summary>",
  "alerts": [
    { "type": "<warn|danger|info|safe>", "title": "<title>", "text": "<detail>" }
  ],
  "categories": ${onchainData?.categories ? JSON.stringify(onchainData.categories) : '[{"name":"Transfers","count":0,"percentage":0}]'},
  "recommendations": ["<recommendation>"]
}

Security rules:
- Score 0-25: Safe
- Score 26-50: Caution
- Score 51-75: Suspicious
- Score 76-100: Dangerous
- Include 3-5 alerts and 3-4 recommendations`

    try {
      const raw = await callGroq(prompt, true)
      const parsed = parseAnalysis(raw)

      const mergeRealData = (p) => {
        if (onchainData) {
          p.balance = onchainData.balance
          p.totalTransactions = onchainData.totalTransactions
          p.walletAge = onchainData.walletAge
          p.categories = onchainData.categories
        }
        if (riskEngineResult) {
          p.riskScore = riskEngineResult.riskScore
          p.riskLabel = riskEngineResult.riskLabel
          p.alerts = riskEngineResult.alerts.length > 0 ? riskEngineResult.alerts : p.alerts
        }
        return p
      }

      if (parsed) {
        setResult(mergeRealData(parsed))
      } else {
        const raw2 = await callGroq(prompt, false)
        const parsed2 = parseAnalysis(raw2)
        if (parsed2) {
          setResult(mergeRealData(parsed2))
        } else {
          setError('Could not parse AI response. Please try again.')
        }
      }
    } catch (e) {
      setError(`Error: ${e.message || 'Check your Groq API key in .env'}`)
    }
    setLoading(false)
  }

  async function askQuestion(q) {
    if (!result || !q.trim()) return
    setAsking(true)
    setAnswer('')
    const prompt = `You are TxGuard AI. The user analyzed this wallet:
Wallet: ${wallet}
Chain: ${chain}
Risk Score: ${result.riskScore}/100
Risk Label: ${result.riskLabel}
Summary: ${result.summary}

User question: "${q.trim()}"

Answer in 2-4 sentences, clearly and helpfully.`
    try {
      const ans = await callGroq(prompt)
      setAnswer(ans)
    } catch {
      setAnswer('Failed to get answer. Please try again.')
    }
    setAsking(false)
  }

  const riskClass = result ? getRiskClass(result.riskScore) : 'safe'

  return (
    <div className="app-root">

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">TX</div>
          <span className="nav-logo-text">TxGuard</span>
          <span className="nav-logo-tag">AI Security</span>
        </div>
        <div className="nav-right">
          {CHAINS.map(c => (
            <span key={c.id} className="nav-chain-pill">{c.label}</span>
          ))}
          <div className="nav-online">
            <div className="nav-online-dot"></div>
            Online
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <h1>Know Before <span>You</span> Send.</h1>
        <p>AI-powered wallet security across 5 chains. Instant risk scores, scam detection, and behavioral analysis.</p>
      </div>

      {/* Scanner */}
      <div className="scanner">

        {/* Input card */}
        <div className="card">
          <div className="chain-row">
            {CHAINS.map(c => (
              <button
                key={c.id}
                className={`chain-btn ${chain === c.id ? 'active' : ''}`}
                onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="input-wrap">
            <input
              className="wallet-input"
              placeholder={selectedChain.placeholder}
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
            />
            <button
              className="scan-btn"
              onClick={analyze}
              disabled={loading || !wallet.trim()}
            >
              {loading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <div className="loading-title">Scanning Wallet</div>
            <div className="loading-sub">TxGuard AI is analyzing security patterns...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-card">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="card">

            {/* Risk score */}
            <div className="score-wrap">
              <div className="score-num">{result.riskScore}</div>
              <div className="score-meta">
                <span className="score-of">Risk score / 100</span>
                <span className={`score-tag ${riskClass}`}>{getRiskLabel(result.riskScore)}</span>
              </div>
            </div>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: `${result.riskScore}%` }}></div>
            </div>

            <div className="divider"></div>

            {/* Stats */}
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-label">Balance</div>
                <div className="stat-value">{result.balance}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Transactions</div>
                <div className="stat-value">{result.totalTransactions}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Wallet Age</div>
                <div className="stat-value">{result.walletAge}</div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Summary */}
            <div className="section-label">AI Summary</div>
            <div className="summary-text">{result.summary}</div>

            <div className="divider"></div>

            {/* Alerts */}
            <div className="section-label">Security Alerts</div>
            {result.alerts?.map((alert, i) => (
              <div key={i} className="alert-item">
                <div className={`alert-dot ${getAlertDotClass(alert.type)}`}></div>
                <div>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-text">{alert.text}</div>
                </div>
              </div>
            ))}

            <div className="divider"></div>

            {/* Transaction breakdown */}
            <div className="section-label">Transaction Breakdown</div>
            {result.categories?.filter(c => c.count > 0).map((cat, i) => (
              <div key={i} className="bar-row">
                <span className="bar-label">{cat.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${cat.percentage}%` }}></div>
                </div>
                <span className="bar-pct">{cat.percentage}%</span>
              </div>
            ))}

            <div className="divider"></div>

            {/* Recommendations */}
            <div className="section-label">Recommendations</div>
            {result.recommendations?.map((rec, i) => (
              <div key={i} className="rec-item">
                <span className="rec-num">0{i + 1}</span>
                <span>{rec}</span>
              </div>
            ))}

            <div className="divider"></div>

            {/* Ask AI */}
            <div className="section-label">Ask TxGuard AI</div>
            <div className="quick-questions">
              {[
                'Is this wallet safe to receive from?',
                'Should I send funds to this address?',
                'What are the biggest red flags?',
              ].map(q => (
                <button key={q} className="quick-q" onClick={() => { setQuestion(q); askQuestion(q) }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="ask-row">
              <input
                className="ask-input"
                placeholder="Ask anything about this wallet..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askQuestion(question)}
              />
              <button
                className="ask-btn"
                onClick={() => askQuestion(question)}
                disabled={asking || !question.trim()}
              >
                {asking ? '...' : 'Ask'}
              </button>
            </div>
            {asking && <div className="ask-answer">TxGuard is thinking...</div>}
            {answer && !asking && <div className="ask-answer">{answer}</div>}

          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🛡</div>
            <div className="empty-title">Ready to Scan</div>
            <div className="empty-sub">Paste any wallet address above to get an instant AI security analysis</div>
            <div className="sample-wallets">
              {Object.entries(SAMPLE_WALLETS).map(([c, addr]) => (
                <div
                  key={c}
                  className="sample-wallet"
                  onClick={() => { setChain(c); setWallet(addr) }}
                >
                  {c.toUpperCase()} · {addr.slice(0, 6)}...{addr.slice(-4)}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="footer">
        TxGuard · AI-Powered Blockchain Security · Know Before You Send
      </footer>

    </div>
  )
}