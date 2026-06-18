 import { useState } from 'react'
import './App.css'
import { getWalletData } from './blockchain'
import { calculateRisk } from './riskEngine'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const CHAINS = [
  { id: 'ethereum', label: 'Ethereum', placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
  { id: 'bnb',      label: 'BNB',      placeholder: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
  { id: 'solana',   label: 'Solana',   placeholder: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm' },
  { id: 'bitcoin',  label: 'Bitcoin',  placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { id: 'celo',     label: 'Celo',     placeholder: '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e' },
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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
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
  try { return JSON.parse(raw) } catch {}
  try { const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) return JSON.parse(m[1].trim()) } catch {}
  try { const m = raw.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]) } catch {}
  try { const s = raw.indexOf('{'), e = raw.lastIndexOf('}'); if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1)) } catch {}
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

function getAlertDot(type) {
  if (type === 'safe') return 'safe'
  if (type === 'warn') return 'warn'
  if (type === 'danger') return 'danger'
  if (type === 'critical') return 'critical'
  return 'info'
}

export default function App() {
  const [chain, setChain]       = useState('ethereum')
  const [wallet, setWallet]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [asking, setAsking]     = useState(false)

  const selectedChain = CHAINS.find(c => c.id === chain)

  async function analyze() {
    if (!wallet.trim()) return
    setLoading(true); setResult(null); setError(''); setAnswer('')

    let onchainData = null
    try { onchainData = await getWalletData(wallet.trim(), chain) } catch (e) { console.warn('Blockchain fetch failed:', e) }

    let riskEngineResult = null
    try { riskEngineResult = await calculateRisk(wallet.trim(), chain, onchainData) } catch (e) { console.warn('Risk engine failed:', e) }

    const chainName = chain === 'bnb' ? 'BNB Chain' : chain.charAt(0).toUpperCase() + chain.slice(1)
    const dataContext = onchainData
      ? `LIVE BLOCKCHAIN DATA:\n- Balance: ${onchainData.balance}\n- Total Transactions: ${onchainData.totalTransactions}\n- Wallet Age: ${onchainData.walletAge}\n- Categories: ${JSON.stringify(onchainData.categories)}`
      : `LIVE BLOCKCHAIN DATA: Could not fetch live data, use your best security assessment.`

    const prompt = `You are TxGuard, a blockchain security AI. Analyze this wallet.
Wallet: ${wallet.trim()}
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
Rules: 0-25=Safe, 26-50=Caution, 51-75=Suspicious, 76-100=Dangerous. Include 3-5 alerts and 3-4 recommendations.`

    try {
      const raw = await callGroq(prompt, true)
      const parsed = parseAnalysis(raw)
      const merge = (p) => {
        if (onchainData) { p.balance = onchainData.balance; p.totalTransactions = onchainData.totalTransactions; p.walletAge = onchainData.walletAge; p.categories = onchainData.categories }
        if (riskEngineResult) { p.riskScore = riskEngineResult.riskScore; p.riskLabel = riskEngineResult.riskLabel; if (riskEngineResult.alerts.length > 0) p.alerts = riskEngineResult.alerts }
        return p
      }
      if (parsed) { setResult(merge(parsed)) }
      else {
        const raw2 = await callGroq(prompt, false)
        const parsed2 = parseAnalysis(raw2)
        if (parsed2) setResult(merge(parsed2))
        else setError('Could not parse AI response. Please try again.')
      }
    } catch (e) { setError(`Error: ${e.message || 'Check your Groq API key in .env'}`) }
    setLoading(false)
  }

  async function askQuestion(q) {
    if (!result || !q.trim()) return
    setAsking(true); setAnswer('')
    const prompt = `You are TxGuard AI. Wallet: ${wallet}, Chain: ${chain}, Risk: ${result.riskScore}/100 (${result.riskLabel}), Summary: ${result.summary}. User asks: "${q.trim()}". Answer in 2-4 sentences.`
    try { setAnswer(await callGroq(prompt)) } catch { setAnswer('Failed to get answer. Please try again.') }
    setAsking(false)
  }

  const riskClass = result ? getRiskClass(result.riskScore) : 'safe'

  return (
    <div className="app-container">
      {/* Background visual elements */}
      <div className="grid-overlay"></div>
      <div className="glow-bleed"></div>
      <div className="side-glow-left"></div>
      <div className="side-glow-right"></div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">TX</div>
          <span className="nav-logo-text">TxGuard</span>
          <span className="nav-logo-tag">AI Security</span>
        </div>
        <div className="nav-right">
          {CHAINS.map(c => <span key={c.id} className="nav-chain-pill">{c.label}</span>)}
          <div className="nav-online"><div className="nav-online-dot"></div>Online</div>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <div className="hero-bg-image"></div>
        <div className="hero-glow"></div>
        <h1>Know Before <span className="italic-accent">You Send.</span></h1>
        <p>AI-powered wallet security across 5 chains. Instant risk scores, scam detection, and behavioral analysis.</p>
        <div className="stats-bar">
          <div className="stat-item"><div className="stat-value">5</div><div className="stat-label">Chains</div></div>
          <div className="stat-item"><div className="stat-value">AI</div><div className="stat-label">Powered</div></div>
          <div className="stat-item"><div className="stat-value">GoPlus</div><div className="stat-label">Security DB</div></div>
          <div className="stat-item"><div className="stat-value">0–100</div><div className="stat-label">Risk Score</div></div>
        </div>
      </div>

      {/* Scanner */}
      <div className="scanner">

        {/* Input */}
        <div className="card input-card">
          <div className="chain-row">
            {CHAINS.map(c => (
              <button key={c.id} className={`chain-btn ${chain === c.id ? 'active' : ''}`}
                onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="input-wrap">
            <div className="input-inner-container">
              <input className="wallet-input" placeholder={selectedChain.placeholder}
                value={wallet} onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()} />
              
              <div className="mic-icon-wrap">
                <svg className="mic-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </div>
            </div>

            <button className="scan-btn" onClick={analyze} disabled={loading || !wallet.trim()}>
              <span>{loading ? 'Scanning...' : 'Scan Wallet'}</span>
              <div className="arrow-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
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
        {error && <div className="error-card"><span>⚠</span><span>{error}</span></div>}

        {/* Results */}
        {result && !loading && (
          <div className="card result-card">

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

            <div className="stat-grid">
              <div className="stat-box"><div className="stat-box-label">Balance</div><div className="stat-box-value">{result.balance}</div></div>
              <div className="stat-box"><div className="stat-box-label">Transactions</div><div className="stat-box-value">{result.totalTransactions}</div></div>
              <div className="stat-box"><div className="stat-box-label">Wallet Age</div><div className="stat-box-value">{result.walletAge}</div></div>
            </div>

            <div className="divider"></div>
            <div className="section-label">AI Summary</div>
            <div className="summary-text">{result.summary}</div>

            <div className="divider"></div>
            <div className="section-label">Security Alerts</div>
            {result.alerts?.map((alert, i) => (
              <div key={i} className="alert-item">
                <div className={`alert-dot ${getAlertDot(alert.type)}`}></div>
                <div><div className="alert-title">{alert.title}</div><div className="alert-text">{alert.text}</div></div>
              </div>
            ))}

            <div className="divider"></div>
            <div className="section-label">Transaction Breakdown</div>
            {result.categories?.filter(c => c.count > 0).map((cat, i) => (
              <div key={i} className="bar-row">
                <span className="bar-label">{cat.name}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${cat.percentage}%` }}></div></div>
                <span className="bar-pct">{cat.percentage}%</span>
              </div>
            ))}

            <div className="divider"></div>
            <div className="section-label">Recommendations</div>
            {result.recommendations?.map((rec, i) => (
              <div key={i} className="rec-item">
                <span className="rec-num">0{i + 1}</span><span>{rec}</span>
              </div>
            ))}

            <div className="divider"></div>
            <div className="section-label">Ask TxGuard AI</div>
            <div className="quick-questions">
              {['Is this wallet safe to receive from?', 'Should I send funds to this address?', 'What are the biggest red flags?'].map(q => (
                <button key={q} className="quick-q" onClick={() => { setQuestion(q); askQuestion(q) }}>{q}</button>
              ))}
            </div>
            <div className="ask-row">
              <input className="ask-input" placeholder="Ask anything about this wallet..."
                value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askQuestion(question)} />
              <button className="ask-btn" onClick={() => askQuestion(question)} disabled={asking || !question.trim()}>
                {asking ? '...' : 'Ask'}
              </button>
            </div>
            {asking && <div className="ask-answer">TxGuard is thinking...</div>}
            {answer && !asking && <div className="ask-answer">{answer}</div>}
          </div>
        )}

        {/* Empty */}
        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">Ready to Scan</div>
            <div className="empty-sub">Paste any wallet address above to get an instant AI security analysis</div>
            <div className="sample-wallets">
              {Object.entries(SAMPLE_WALLETS).map(([c, addr]) => (
                <div key={c} className="sample-wallet" onClick={() => { setChain(c); setWallet(addr) }}>
                  {c.toUpperCase()} · {addr.slice(0, 6)}...{addr.slice(-4)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Supported Chain Logos */}
      <div className="partner-logos-section">
        <div className="partner-logos-grid">
          <div className="partner-logo chain-logo-item">
            <svg className="chain-logo-svg eth-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.63 14.18 12 18.54l7.37-4.36L12 2zm0 17.51l-7.37-4.36L12 22l7.37-4.85-7.37 4.36z"/>
            </svg>
            Ethereum
          </div>
          <div className="partner-logo chain-logo-item">
            <svg className="chain-logo-svg bnb-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L8.25 5.75L12 9.5L15.75 5.75L12 2ZM5.75 8.25L2 12L5.75 15.75L9.5 12L5.75 8.25ZM18.25 8.25L14.5 12L18.25 15.75L22 12L18.25 8.25ZM12 14.5L8.25 18.25L12 22L15.75 18.25L12 14.5Z"/>
            </svg>
            BNB Chain
          </div>
          <div className="partner-logo chain-logo-item">
            <svg className="chain-logo-svg sol-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.6 15.6h17.8l-3.8 3.8H.8l3.8-3.8zm0-6.8h17.8l-3.8 3.8H.8l3.8-3.8zm14.6-6.8L15.4 5.8H1.6l3.8-3.8h13.8z"/>
            </svg>
            Solana
          </div>
          <div className="partner-logo chain-logo-item">
            <svg className="chain-logo-svg btc-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zm-6.9 1.4c.18-.84-.52-1.3-1.4-1.6.85-.2 1.5-.77 1.34-1.74-.23-1.36-1.55-1.57-2.8-1.76l-.4 1.6h-.93l.4-1.62h-.94l-.4 1.62h-.9l-.42-1.7H8.7l.42 1.7H7.7L7.3 11l.9.22-.38 1.58-.93-.23-.42 1.7.92.23-.38 1.54h.95l.38-1.54.9.22-.38 1.54h.95l.4-1.58c1.38.1 2.8.2 3.12-1.12.26-1.07-.37-1.68-1.2-1.93zM10.8 9.3h1.7c.36 0 .7.12.63.78-.07.72-.45.72-.8.72h-1.53V9.3zm-.26 4.34h1.9c.35 0 .8.15.7 1-.08.8-.52.88-.93.88h-1.67v-1.88z"/>
            </svg>
            Bitcoin
          </div>
          <div className="partner-logo chain-logo-item">
            <svg className="chain-logo-svg celo-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="9.5" cy="12" r="6" />
              <circle cx="14.5" cy="12" r="6" />
            </svg>
            Celo
          </div>
        </div>
      </div>

      <footer className="footer">TxGuard · AI-Powered Blockchain Security · Know Before You Send</footer>
    </div>
  )
}