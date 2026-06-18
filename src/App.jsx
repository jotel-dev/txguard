import { useState, useEffect } from 'react'
import './App.css'

// ── Celo Payment Contract Configuration ──
const CONTRACT_ADDRESS = '0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10'
const SCAN_FEE_SELECTOR = '0xf71d1732' // scanFee() view function selector
const PAY_SCAN_SELECTOR = '0x0752a777' // payScan() payable function selector

// ── MiniPay Detection ──
const isMiniPay = typeof window !== 'undefined' &&
  window.ethereum?.isMiniPay === true

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
  const [chain, setChain]       = useState(isMiniPay ? 'celo' : 'ethereum')
  const [wallet, setWallet]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [asking, setAsking]     = useState(false)
  const [miniPayAddress, setMiniPayAddress] = useState('')

  // ── Payment & Contract State ──
  const [scanFeeWei, setScanFeeWei]   = useState('10000000000000000') // Default: 0.01 CELO
  const [scanFeeCelo, setScanFeeCelo] = useState('0.01')
  const [paying, setPaying]           = useState(false)
  const [paidWallets, setPaidWallets] = useState({})

  // ── Fetch Scan Fee from Contract on Mount ──
  useEffect(() => {
    async function loadFee() {
      if (window.ethereum) {
        try {
          const res = await window.ethereum.request({
            method: 'eth_call',
            params: [{ to: CONTRACT_ADDRESS, data: SCAN_FEE_SELECTOR }, 'latest']
          })
          if (res && res !== '0x') {
            const wei = BigInt(res)
            setScanFeeWei(wei.toString())
            const celoVal = Number(wei) / 1e18
            setScanFeeCelo(celoVal.toString())
          }
        } catch (e) {
          console.warn('Failed to fetch fee from Celo contract:', e)
        }
      }
    }
    loadFee()
  }, [])

  // ── Auto-detect MiniPay wallet address ──
  useEffect(() => {
    if (isMiniPay && window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => {
          if (accounts[0]) {
            setMiniPayAddress(accounts[0])
            setWallet(accounts[0])
            setChain('celo')
          }
        })
        .catch(err => console.warn('MiniPay wallet fetch failed:', err))
    }
  }, [])

  const selectedChain = CHAINS.find(c => c.id === chain)

  async function analyze() {
    if (!wallet.trim()) return
    setResult(null); setError(''); setAnswer('')

    const targetAddress = wallet.trim().toLowerCase()
    let txHash = paidWallets[targetAddress] || null

    // ── Payment Check for Celo/MiniPay ──
    if (chain === 'celo' || isMiniPay) {
      if (!txHash) {
        setPaying(true)
        let userAddress = miniPayAddress
        if (!userAddress && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
            userAddress = accounts[0]
            setMiniPayAddress(userAddress)
          } catch (e) {
            setError('Wallet connection required for payment.')
            setPaying(false)
            return
          }
        }
        if (!userAddress) {
          setError('No Celo wallet detected. Please open inside MiniPay or install a Web3 wallet.')
          setPaying(false)
          return
        }

        try {
          let txValue = BigInt(scanFeeWei)
          // Safety Fallback: Ensure value is at least 0.01 CELO (10^16 wei) if dynamic loading returned 0 or failed
          if (txValue < 10000000000000000n) {
            txValue = 10000000000000000n
          }

          txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddress,
              to: CONTRACT_ADDRESS,
              value: '0x' + txValue.toString(16),
              data: PAY_SCAN_SELECTOR
            }]
          })

          // Poll for receipt
          let confirmed = false
          const maxAttempts = 15
          for (let i = 0; i < maxAttempts; i++) {
            const receipt = await window.ethereum.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            })
            if (receipt) {
              if (receipt.status === '0x1' || receipt.status === '0x01' || receipt.status === 1 || receipt.status === true) {
                confirmed = true
                break
              } else {
                throw new Error('Payment transaction reverted on-chain.')
              }
            }
            await new Promise(r => setTimeout(r, 2000))
          }
          if (!confirmed) {
            throw new Error('Payment transaction timed out. Please check Celoscan.')
          }

          // Cache payment for this address
          setPaidWallets(prev => ({ ...prev, [targetAddress]: txHash }))
          setPaying(false)
        } catch (e) {
          console.error('Payment failed:', e)
          setError(e.message || 'Payment transaction rejected or failed.')
          setPaying(false)
          return
        }
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim(), chain, txHash })
      })
      const data = await response.json()
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Server returned an error. Please try again.')
      }
    } catch (e) {
      console.error('Scan request failed:', e)
      setError('Failed to reach backend server. Please try again.')
    }
    setLoading(false)
  }

  async function askQuestion(q) {
    if (!result || !q.trim()) return
    setAsking(true); setAnswer('')
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.trim(),
          chain,
          riskScore: result.riskScore,
          riskLabel: result.riskLabel,
          summary: result.summary,
          question: q.trim()
        })
      })
      const data = await response.json()
      if (response.ok) {
        setAnswer(data.answer)
      } else {
        setAnswer(data.error || 'Failed to get answer. Please try again.')
      }
    } catch (e) {
      console.error('Ask request failed:', e)
      setAnswer('Failed to reach server. Please try again.')
    }
    setAsking(false)
  }

  const riskClass = result ? getRiskClass(result.riskScore) : 'safe'

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setWallet(text.trim())
    } catch (e) {
      console.warn('Clipboard read failed:', e)
    }
  }

  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = result ? circumference - (result.riskScore / 100) * circumference : 0

  return (
    <div className="app-container">
      <div className="grid-overlay"></div>
      <div className="glow-bleed"></div>
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">TX</div>
          <span className="nav-logo-text">TxGuard</span>
          <span className="nav-logo-tag">AI Security</span>
        </div>
        <div className="nav-right">
          <div className="nav-online"><div className="nav-online-dot"></div>Online</div>
        </div>
      </nav>

      {/* MiniPay Banner */}
      {isMiniPay && (
        <div className="minipay-banner">
          ⚡ Running inside MiniPay · Scan wallet before sending
        </div>
      )}

      {/* Hero: Hidden when displaying results to save vertical space on mobile */}
      {!result && (
        <div className="hero">
          <div className="hero-glow"></div>
          <h1>Know Before <span className="italic-accent">You Send.</span></h1>
          <p>AI-powered wallet threat scanning. Get instant risk scores, scam detection, and transaction history analysis.</p>
        </div>
      )}

      {/* Scanner Wrapper */}
      <div className="scanner">
        {/* Input Card */}
        <div className="card input-card">
          {/* Hide chain selector in MiniPay — always Celo */}
          {!isMiniPay && (
            <div className="chain-row">
              {CHAINS.map(c => (
                <button key={c.id} className={`chain-btn ${chain === c.id ? 'active' : ''}`}
                  onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {isMiniPay && (
            <div className="minipay-chain-badge">
              <span className="minipay-badge-dot"></span> Celo Network
            </div>
          )}

          <div className="input-wrap">
            <div className="input-inner-container">
              <input className="wallet-input"
                placeholder={selectedChain.placeholder}
                value={wallet}
                disabled={loading || paying}
                onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && !paying && analyze()} />
              {wallet && !loading && !paying && (
                <button className="clear-btn" onClick={() => setWallet('')}>✕</button>
              )}
            </div>
            {!wallet && (
              <button className="paste-btn" onClick={handlePaste} disabled={loading || paying}>
                Paste
              </button>
            )}
            <button className="scan-btn" onClick={analyze} disabled={loading || paying || !wallet.trim()}>
              {paying ? 'Paying...' : loading ? 'Scan' : 'Scan'}
              <span className="arrow-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Quick Action Suggestion: Scan My MiniPay Wallet */}
          {isMiniPay && miniPayAddress && wallet.toLowerCase() !== miniPayAddress.toLowerCase() && (
            <div className="quick-scan-card" onClick={() => { setWallet(miniPayAddress) }}>
              <div className="quick-scan-icon">⚡</div>
              <div className="quick-scan-info">
                <div className="quick-scan-title">Scan My Wallet</div>
                <div className="quick-scan-addr">{miniPayAddress.slice(0, 6)}...{miniPayAddress.slice(-4)}</div>
              </div>
              <div className="quick-scan-arrow">→</div>
            </div>
          )}
        </div>

        {/* Paying Loader */}
        {paying && (
          <div className="loading-card payment-loading-card">
            <div className="loading-spinner payment-spinner"></div>
            <div className="loading-title">Celo Payment Pending</div>
            <div className="loading-sub">Please approve the {scanFeeCelo} CELO scan fee in your MiniPay wallet...</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <div className="loading-title">Analyzing Wallet</div>
            <div className="loading-sub">TxGuard AI is fetching and scanning security patterns...</div>
          </div>
        )}

        {/* Error */}
        {error && <div className="error-card"><span>⚠</span><span>{error}</span></div>}

        {/* Results Dashboard */}
        {result && !loading && (
          <div className="card result-card">
            {/* Dashboard Header: Circular SVG Score Ring + Metadata */}
            <div className="dashboard-header">
              <div className="gauge-wrap">
                <svg className="gauge-svg" viewBox="0 0 80 80">
                  <circle className="gauge-bg" cx="40" cy="40" r={radius} />
                  <circle className={`gauge-fill ${riskClass}`} cx="40" cy="40" r={radius}
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                </svg>
                <div className="gauge-score">
                  <span className="gauge-score-num">{result.riskScore}</span>
                  <span className="gauge-score-label">/100</span>
                </div>
              </div>
              <div className="dashboard-meta">
                <span className="dashboard-subtitle">Threat Score</span>
                <span className={`dashboard-tag ${riskClass}`}>{getRiskLabel(result.riskScore)}</span>
              </div>
            </div>

            {/* Onchain Payment Receipt badge */}
            {result.paymentTx && (
              <div className="payment-receipt-badge">
                <span className="receipt-icon">⚡</span>
                <span className="receipt-text">
                  On-Chain Scan Receipt:{" "}
                  <a
                    href={`https://celoscan.io/tx/${result.paymentTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    {result.paymentTx.slice(0, 10)}...{result.paymentTx.slice(-8)} ↗
                  </a>
                </span>
              </div>
            )}

            {/* Metrics Asset Grid */}
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-box-label">Balance</div>
                <div className="stat-box-value">{result.balance}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Transactions</div>
                <div className="stat-box-value">{result.totalTransactions}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Wallet Age</div>
                <div className="stat-box-value">{result.walletAge}</div>
              </div>
            </div>

            <div className="divider"></div>
            
            {/* AI Summary Block */}
            <div className="section-label">AI Summary</div>
            <div className={`summary-text-box ${riskClass}`}>
              <p className="summary-text">{result.summary}</p>
            </div>

            <div className="divider"></div>

            {/* Security Alerts Section */}
            <div className="section-label">Security Alerts</div>
            <div className="alerts-list">
              {result.alerts?.map((alert, i) => (
                <div key={i} className="alert-item">
                  <div className={`alert-dot ${getAlertDot(alert.type)}`}></div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-text">{alert.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            {/* Categories Section */}
            <div className="section-label">Transaction Breakdown</div>
            <div className="categories-list">
              {result.categories?.filter(c => c.count > 0).map((cat, i) => (
                <div key={i} className="bar-row">
                  <span className="bar-label">{cat.name}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${cat.percentage}%` }}></div></div>
                  <span className="bar-pct">{cat.percentage}%</span>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            {/* Recommendations Section */}
            <div className="section-label">Recommendations</div>
            <div className="recs-list">
              {result.recommendations?.map((rec, i) => (
                <div key={i} className="rec-item">
                  <span className="rec-num">0{i + 1}</span>
                  <span className="rec-text">{rec}</span>
                </div>
              ))}
            </div>

            <div className="divider"></div>

            {/* AI Assistant Chat Section */}
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
            {asking && <div className="ask-answer thinking">TxGuard is thinking...</div>}
            {answer && !asking && <div className="ask-answer">{answer}</div>}
          </div>
        )}

        {/* Empty State when no result */}
        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">Ready to Scan</div>
            <div className="empty-sub">
              {isMiniPay
                ? 'Enter or paste any Celo wallet address above to check it before sending.'
                : 'Enter or paste any wallet address above to get an instant AI security analysis.'}
            </div>
            {!isMiniPay && (
              <div className="sample-wallets">
                {Object.entries(SAMPLE_WALLETS).map(([c, addr]) => (
                  <div key={c} className="sample-wallet" onClick={() => { setChain(c); setWallet(addr) }}>
                    {c.toUpperCase()} · {addr.slice(0, 6)}...{addr.slice(-4)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="footer-content">
          <span>TxGuard · AI-Powered Blockchain Security · Know Before You Send</span>
          <a href="https://github.com/jotel-dev/txguard/issues" target="_blank" rel="noopener noreferrer" className="feedback-link">
            💬 Share Feedback / Report Bug
          </a>
        </div>
      </footer>
    </div>
  )
}