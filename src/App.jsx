import { useState } from 'react'
import './App.css'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum', icon: '⟠', placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
  { id: 'bnb',      label: 'BNB Chain', icon: '⬡', placeholder: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
  { id: 'solana',   label: 'Solana',   icon: '◎', placeholder: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm' },
  { id: 'bitcoin',  label: 'Bitcoin',  icon: '₿', placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
]

const SAMPLE_WALLETS = {
  ethereum: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e',
  bnb:      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  solana:   'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm',
  bitcoin:  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
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
  // Try 1: direct JSON parse
  try { return JSON.parse(raw) } catch {}
  // Try 2: ```json ... ``` block
  try {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (m) return JSON.parse(m[1].trim())
  } catch {}
  // Try 3: first { ... } block
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch {}
  // Try 4: strip everything before first {
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) return JSON.parse(raw.slice(start, end + 1))
  } catch {}
  return null
}

function getRiskClass(score) {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'danger'
  return 'critical'
}

function getRiskLabel(score) {
  if (score <= 25) return 'SAFE'
  if (score <= 50) return 'CAUTION'
  if (score <= 75) return 'SUSPICIOUS'
  return 'DANGEROUS'
}

const CAT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export default function App() {
  const [chain, setChain]         = useState('ethereum')
  const [wallet, setWallet]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [question, setQuestion]   = useState('')
  const [answer, setAnswer]       = useState('')
  const [asking, setAsking]       = useState(false)

  const selectedChain = CHAINS.find(c => c.id === chain)

  async function analyze() {
    if (!wallet.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    setAnswer('')

    const prompt = `You are TxGuard, a blockchain security intelligence AI agent. Analyze this wallet address for security risks.

Wallet: ${wallet.trim()}
Chain: ${chain === 'bnb' ? 'BNB Chain' : chain.charAt(0).toUpperCase() + chain.slice(1)}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "riskScore": <number 0-100, where 0=completely safe, 100=extremely dangerous>,
  "riskLabel": "<SAFE | CAUTION | SUSPICIOUS | DANGEROUS>",
  "walletAge": "<estimated age or 'Unknown'>",
  "totalTransactions": "<estimated count or range>",
  "balance": "<estimated or 'Unable to verify without live data'>",
  "summary": "<2-3 sentence plain English summary of this wallet's security status and activity>",
  "alerts": [
    { "type": "<warn|danger|info|safe>", "icon": "<single emoji>", "title": "<short alert title>", "text": "<alert detail>" }
  ],
  "categories": [
    { "name": "<category>", "count": <number>, "percentage": <0-100> }
  ],
  "recommendations": [
    "<actionable recommendation string>"
  ]
}

Base your analysis on:
- The wallet address format and any patterns you can identify
- Common risk indicators for ${chain} wallets
- General blockchain security best practices
- Note clearly when you're making educated assessments vs verified facts
- Include 3-5 alerts, 3-5 categories (like: Transfers, DeFi, NFT, Bridge, Swap), and 3-4 recommendations`

    try {
      const raw = await callGroq(prompt, true)
      const parsed = parseAnalysis(raw)
      if (parsed) {
        setResult(parsed)
      } else {
        const raw2 = await callGroq(prompt, false)
        const parsed2 = parseAnalysis(raw2)
        if (parsed2) {
          setResult(parsed2)
        } else {
          setError('Could not parse AI response. Make sure your VITE_GROQ_API_KEY is correct in .env and restart npm run dev.')
        }
      }
    } catch (e) {
      setError(`AI Error: ${e.message || 'Check your Groq API key in .env and restart npm run dev'}`)
    }
    setLoading(false)
  }

  async function askQuestion(q) {
    if (!result || !q.trim()) return
    setAsking(true)
    setAnswer('')
    const prompt = `You are TxGuard, a blockchain security AI. The user has analyzed this wallet:

Wallet: ${wallet}
Chain: ${chain}
Risk Score: ${result.riskScore}/100
Risk Label: ${result.riskLabel}
Summary: ${result.summary}

The user is now asking: "${q.trim()}"

Answer in 2-4 sentences, clearly and helpfully. Focus on security and safety implications.`
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
    <div className="app">

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">TX</div>
          <span className="nav-logo-text">Tx<span>Guard</span></span>
          <span className="nav-badge">AI SECURITY</span>
        </div>
        <div className="nav-right">
          <span className="nav-chain-badge">⟠ ETH · ⬡ BNB · ◎ SOL · ₿ BTC</span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-tag">
          <div className="hero-dot"></div>
          AI-POWERED BLOCKCHAIN SECURITY
        </div>
        <h1>Know Before<br /><span>You Send.</span></h1>
        <p>Analyze any wallet address across multiple chains. Get instant AI-driven security scores, scam detection, and transaction insights.</p>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">4+</div>
            <div className="stat-label">Chains Supported</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">AI</div>
            <div className="stat-label">Powered Analysis</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">0-100</div>
            <div className="stat-label">Risk Scoring</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">FREE</div>
            <div className="stat-label">To Use</div>
          </div>
        </div>
      </section>

      {/* ── Main ── */}
      <main className="main">

        {/* Search Card */}
        <div className="search-card">
          <div className="search-label">SELECT CHAIN</div>
          <div className="chain-selector">
            {CHAINS.map(c => (
              <button
                key={c.id}
                className={`chain-btn ${chain === c.id ? 'active' : ''}`}
                onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
              >
                <span className="chain-icon">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          <div className="search-label" style={{ marginTop: '1rem' }}>WALLET ADDRESS</div>
          <div className="input-row">
            <input
              className="wallet-input"
              placeholder={selectedChain.placeholder}
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
            />
            <button
              className="analyze-btn"
              onClick={analyze}
              disabled={loading || !wallet.trim()}
            >
              {loading ? '...' : '🔍 ANALYZE'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <div className="loading-title">SCANNING WALLET</div>
            <div className="loading-sub">TxGuard AI is analyzing security patterns...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert-item alert-danger" style={{ borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <span className="alert-icon">⚠️</span>
            <div className="alert-text"><strong>Error: </strong>{error}</div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            <div className="results-grid">

              {/* Risk Score */}
              <div className="result-card">
                <div className="card-label">RISK SCORE</div>
                <div className="risk-score-wrap">
                  <div className={`risk-circle risk-${riskClass}`}>
                    <span className="risk-number">{result.riskScore}</span>
                    <span className="risk-of">/100</span>
                  </div>
                  <div className="risk-info">
                    <div className="risk-label" style={{ color: riskClass === 'safe' ? 'var(--green)' : riskClass === 'caution' ? 'var(--yellow)' : riskClass === 'danger' ? 'var(--orange)' : 'var(--red)' }}>
                      {getRiskLabel(result.riskScore)}
                    </div>
                    <div className="risk-desc">
                      {result.walletAge !== 'Unknown' && <div>Age: {result.walletAge}</div>}
                      <div>Txns: {result.totalTransactions}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="result-card">
                <div className="card-label">SECURITY STATUS</div>
                <div className={`status-badge status-${riskClass}`}>
                  {riskClass === 'safe' ? '✅' : riskClass === 'caution' ? '⚠️' : riskClass === 'danger' ? '🚨' : '🔴'}
                  {' '}{result.riskLabel}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Chain: <strong style={{ color: 'var(--text-primary)' }}>{selectedChain.icon} {selectedChain.label}</strong><br />
                  Balance: {result.balance}
                </div>
              </div>

              {/* Summary */}
              <div className="result-card full-width">
                <div className="card-label">AI SUMMARY</div>
                <div className="summary-text">{result.summary}</div>
              </div>

              {/* Alerts */}
              <div className="result-card">
                <div className="card-label">SECURITY ALERTS</div>
                <div className="alerts-list">
                  {result.alerts?.map((alert, i) => (
                    <div key={i} className={`alert-item alert-${alert.type}`}>
                      <span className="alert-icon">{alert.icon}</span>
                      <div className="alert-text">
                        <strong>{alert.title}: </strong>{alert.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="result-card">
                <div className="card-label">TRANSACTION CATEGORIES</div>
                <div className="categories-list">
                  {result.categories?.map((cat, i) => (
                    <div key={i} className="category-item">
                      <div className="category-left">
                        <div className="category-dot" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="category-name">{cat.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="category-count">{cat.count} txns</span>
                        <div className="category-bar-wrap">
                          <div className="category-bar" style={{ width: `${cat.percentage}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="result-card full-width">
                <div className="card-label">RECOMMENDATIONS</div>
                <div className="recs-list">
                  {result.recommendations?.map((rec, i) => (
                    <div key={i} className="rec-item">
                      <div className="rec-num">{i + 1}</div>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ask AI */}
            <div className="ask-card">
              <div className="ask-title">ASK TXGUARD AI</div>
              <div className="quick-questions">
                {[
                  'Is this wallet safe to receive from?',
                  'Should I send funds to this address?',
                  'What are the biggest red flags?',
                  'Is this wallet associated with any scams?',
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
                <button className="ask-btn" onClick={() => askQuestion(question)} disabled={asking || !question.trim()}>
                  {asking ? '⏳' : '➤'}
                </button>
              </div>
              {asking && <div className="ask-answer">TxGuard is thinking...</div>}
              {answer && !asking && <div className="ask-answer">{answer}</div>}
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">READY TO SCAN</div>
            <div className="empty-sub">Enter a wallet address above to get an instant AI security analysis</div>
            <div className="sample-wallets">
              {Object.entries(SAMPLE_WALLETS).map(([c, addr]) => (
                <div
                  key={c}
                  className="sample-wallet"
                  onClick={() => { setChain(c); setWallet(addr) }}
                  title={`Try ${c} sample`}
                >
                  {CHAINS.find(ch => ch.id === c)?.icon} {addr.slice(0, 8)}...{addr.slice(-6)}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <span>TXGUARD</span> · AI-Powered Blockchain Security · Know Before You Send · Built with Gemini AI
      </footer>

    </div>
  )
}