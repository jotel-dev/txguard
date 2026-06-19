import { useState, useEffect } from 'react'
import './App.css'

// ── Celo Payment Contract Configuration ──
const CONTRACT_ADDRESS = '0x20FFa15Ca89AfA1b855fD2ff4f0A4D453FfB0C10'
const SCAN_FEE_SELECTOR = '0xf71d1732' // scanFee() view function selector
const PAY_SCAN_SELECTOR = '0x0752a777' // payScan() payable function selector

// ── cUSD fee currency address (Celo Mainnet) ──
// Required by MiniPay to pay gas fees in cUSD instead of CELO
const CUSD_FEE_CURRENCY = '0x765DE816845861e75A25fCA122bb6898B8B1282a'

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

// ── SVG Icon Components ──

const EthereumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L5 12.5L12 15.5L19 12.5L12 2Z" fill="#627EEA" opacity="0.8"/>
    <path d="M12 15.5L5 12.5L12 22L19 12.5L12 15.5Z" fill="#627EEA"/>
    <path d="M12 2L12 9.5L18.5 12.5L12 2Z" fill="#627EEA" opacity="0.4"/>
    <path d="M12 9.5L5.5 12.5L12 2L12 9.5Z" fill="#627EEA" opacity="0.6"/>
  </svg>
)

const BnbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#F3BA2F">
    <path d="M12 2L14.5 4.5L9 10L6.5 7.5L12 2Z"/>
    <path d="M16.5 6.5L19 9L12 16L5 9L7.5 6.5L12 11.5L16.5 6.5Z"/>
    <path d="M19 11.5L21.5 14L12 22L2.5 14L5 11.5L12 18L19 11.5Z"/>
    <path d="M12 2L9.5 4.5L12 7L14.5 4.5L12 2Z"/>
  </svg>
)

const SolanaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 6H20L16.5 9.5H4V6Z" fill="#9945FF"/>
    <path d="M4 14.5H20L16.5 18H4V14.5Z" fill="#14F195"/>
    <path d="M16.5 10.5H4V14H16.5L20 10.5H16.5Z" fill="#00C2FF"/>
  </svg>
)

const BitcoinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#F7931A">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM14.5 13.5C14.5 14.88 13.38 16 12 16H9V8H12C13.38 8 14.5 9.12 14.5 10.5C14.5 11.12 14.27 11.68 13.9 12.12C14.27 12.44 14.5 12.94 14.5 13.5Z"/>
  </svg>
)

const CeloIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#35D07F" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="5" fill="#35D07F"/>
    <circle cx="12" cy="4.5" r="2" fill="#FBCC5C"/>
    <circle cx="12" cy="19.5" r="2" fill="#FBCC5C"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
)

const PaperclipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
)

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

const CHAIN_ICONS = {
  ethereum: <EthereumIcon />,
  bnb: <BnbIcon />,
  solana: <SolanaIcon />,
  bitcoin: <BitcoinIcon />,
  celo: <CeloIcon />
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
            params: [{
              to: CONTRACT_ADDRESS,
              data: SCAN_FEE_SELECTOR,
              feeCurrency: CUSD_FEE_CURRENCY  // ✅ Fix: required for MiniPay
            }, 'latest']
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
          // Safety Fallback: Ensure value is at least 0.01 CELO (10^16 wei)
          if (txValue < 10000000000000000n) {
            txValue = 10000000000000000n
          }

          txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userAddress,
              to: CONTRACT_ADDRESS,
              value: '0x' + txValue.toString(16),
              data: PAY_SCAN_SELECTOR,
              feeCurrency: CUSD_FEE_CURRENCY  // ✅ Fix: tells MiniPay to pay gas in cUSD
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
              if (
                receipt.status === '0x1' ||
                receipt.status === '0x01' ||
                receipt.status === 1 ||
                receipt.status === true
              ) {
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
          const msg = e.message || ''
          // ✅ Fix: user-friendly error messages instead of raw RPC errors
          if (msg.includes('Insufficient fee') || msg.includes('fee')) {
            setError('Your MiniPay wallet needs cUSD to cover the transaction fee. Please top up your cUSD balance.')
          } else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User denied')) {
            setError('Payment was cancelled.')
          } else {
            setError(msg || 'Payment transaction rejected or failed.')
          }
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

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setWallet(text.trim())
    } catch (e) {
      console.warn('Clipboard read failed:', e)
    }
  }

  const handleQuickChip = (action) => {
    if (action === 'safe') {
      if (result) {
        setQuestion('Is this wallet safe to receive from?')
        askQuestion('Is this wallet safe to receive from?')
      } else {
        const defaultAddr = SAMPLE_WALLETS[chain] || '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'
        setWallet(defaultAddr)
        setTimeout(() => {
          analyze()
        }, 50)
      }
    } else {
      if (wallet.trim()) {
        analyze()
      } else {
        const defaultAddr = SAMPLE_WALLETS[chain] || '0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e'
        setWallet(defaultAddr)
        setTimeout(() => {
          analyze()
        }, 50)
      }
    }
  }

  // ── Render Helpers for Result Cards, Loaders, Error & Empty States ──

  const renderResults = () => {
    if (!result) return null
    return (
      <div className="result-card">
        <div className="score-wrap">
          <div className="score-num">{result.riskScore}</div>
          <div className={`score-tag ${getRiskClass(result.riskScore)}`}>
            {getRiskLabel(result.riskScore)}
          </div>
        </div>

        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${result.riskScore}%` }}></div>
        </div>

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

        <div className="section-label">AI Summary</div>
        <div className="summary-text-box">
          <p className="summary-text">{result.summary}</p>
        </div>

        <div className="divider"></div>

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

        <div className="section-label">Transaction Breakdown</div>
        <div className="categories-list">
          {result.categories?.filter(c => c.count > 0).map((cat, i) => (
            <div key={i} className="bar-row">
              <span className="bar-label">{cat.name}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${cat.percentage}%` }}></div>
              </div>
              <span className="bar-pct">{cat.percentage}%</span>
            </div>
          ))}
        </div>

        <div className="divider"></div>

        <div className="section-label">Recommendations</div>
        <div className="recs-list">
          {result.recommendations?.map((rec, i) => (
            <div key={i} className="rec-item">
              <span className="rec-num">{i + 1}</span>
              <span className="rec-text">{rec}</span>
            </div>
          ))}
        </div>

        <div className="divider"></div>

        <div className="section-label">Ask TxGuard AI</div>
        <div className="quick-questions">
          {['Is this wallet safe to receive from?', 'Should I send funds to this address?', 'What are the biggest red flags?'].map(q => (
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
            {asking ? '...' : 'Ask'}
          </button>
        </div>
        {asking && <div className="ask-answer thinking">TxGuard is thinking...</div>}
        {answer && !asking && <div className="ask-answer">{answer}</div>}
      </div>
    )
  }

  const renderLoading = () => {
    if (!loading) return null
    return (
      <div className="loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-title">Analyzing Wallet</div>
        <div className="loading-sub">TxGuard AI is fetching and scanning security patterns...</div>
      </div>
    )
  }

  const renderPaying = () => {
    if (!paying) return null
    return (
      <div className="loading-card payment-loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-title">Celo Payment Pending</div>
        <div className="loading-sub">Please approve the {scanFeeCelo} CELO scan fee in your MiniPay wallet...</div>
      </div>
    )
  }

  const renderError = () => {
    if (!error) return null
    return (
      <div className="error-card">
        <span>⚠</span>
        <span>{error}</span>
      </div>
    )
  }

  const renderEmptyState = () => {
    if (result || loading || paying || error) return null
    return (
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
              <div
                key={c}
                className="sample-wallet"
                onClick={() => {
                  setChain(c)
                  setWallet(addr)
                }}
              >
                {c.toUpperCase()} · {addr.slice(0, 6)}...{addr.slice(-4)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`app-root ${isMiniPay ? 'force-mobile' : ''}`}>
      {/* ── DESKTOP VIEW SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/Gemini_Generated_Image_pwgpjipwgpjipwgp.png" alt="TxGuard Logo" className="logo-img" />
        </div>
        {CHAINS.map(c => (
          <button
            key={c.id}
            className={`sidebar-chain-btn ${chain === c.id ? 'active' : ''}`}
            onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
            title={c.label}
          >
            {CHAIN_ICONS[c.id]}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-btn" title="Settings">
            <SettingsIcon />
          </button>
        </div>
      </aside>

      {/* ── DESKTOP VIEW MAIN CONTENT ── */}
      <main className="main-content">
        <h1 className="main-heading">What wallet do you want to scan?</h1>
        <p className="main-subtitle">AI-powered security analysis across 5 chains</p>

        <div className="chain-tabs">
          {CHAINS.map(c => (
            <button
              key={c.id}
              className={`chain-tab ${chain === c.id ? 'active' : ''}`}
              onClick={() => { setChain(c.id); setResult(null); setAnswer('') }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="input-card">
          <div className="input-row">
            <SearchIcon />
            <input
              className="wallet-input"
              placeholder={selectedChain.placeholder}
              value={wallet}
              disabled={loading || paying}
              onChange={e => setWallet(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && !paying && analyze()}
            />
            {wallet && !loading && !paying && (
              <button
                onClick={() => setWallet('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-hint)',
                  fontSize: '12px',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            )}
            <button
              className="scan-btn"
              onClick={analyze}
              disabled={loading || paying || !wallet.trim()}
            >
              <span>{paying ? 'Paying...' : 'Scan'}</span>
              <ArrowRightIcon />
            </button>
          </div>
          <div className="input-icons">
            <button className="input-icon-btn" onClick={() => setWallet(w => w + '+')}>➕</button>
            <button className="input-icon-btn" onClick={handlePaste} title="Paste"><CopyIcon /></button>
            <button className="input-icon-btn" title="Link"><LinkIcon /></button>
            <button className="input-icon-btn" title="Microphone"><MicIcon /></button>
          </div>
        </div>

        <div className="desktop-results">
          {renderPaying()}
          {renderLoading()}
          {renderError()}
          {renderResults()}
          {renderEmptyState()}
        </div>

        <footer className="footer">
          TxGuard · AI-Powered Blockchain Security · Know Before You Send
        </footer>
      </main>

      {/* ── MOBILE / MINIPAY VIEW WRAPPER ── */}
      <div className="mobile-wrapper">
        <div className="mobile-logo-wrap">
          <div className="mobile-logo-inner">
            <img src="/Gemini_Generated_Image_pwgpjipwgpjipwgp.png" alt="TxGuard Logo" className="logo-img" />
          </div>
        </div>

        <h1 className="mobile-heading">
          Know Before <span className="mobile-heading-accent">You Send.</span>
        </h1>
        <p className="mobile-subtitle">AI-powered wallet security · 5 chains</p>

        <div className="quick-chips">
          <button className="quick-chip" onClick={() => handleQuickChip('scan')}>Scan wallet</button>
          <button className="quick-chip" onClick={() => handleQuickChip('score')}>Check risk score</button>
          <button className="quick-chip" onClick={() => handleQuickChip('safe')}>Is this safe?</button>
        </div>

        <div className="results-scroll-area">
          {renderPaying()}
          {renderLoading()}
          {renderError()}
          {renderResults()}
          {renderEmptyState()}
        </div>
      </div>

      {/* ── MOBILE BOTTOM INPUT AREA ── */}
      <div className="mobile-input-area">
        <div className="mobile-input-card">
          <div className="mobile-input-row">
            <input
              className="mobile-wallet-input"
              placeholder={selectedChain.placeholder}
              value={wallet}
              disabled={loading || paying}
              onChange={e => setWallet(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && !paying && analyze()}
            />
            {wallet && !loading && !paying && (
              <button
                onClick={() => setWallet('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-hint)',
                  fontSize: '12px',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            )}
            <button
              className="mobile-send-btn"
              onClick={analyze}
              disabled={loading || paying || !wallet.trim()}
            >
              <ArrowUpIcon />
            </button>
          </div>
          <div className="mobile-icons-row">
            <button className="mobile-icon-btn" onClick={() => setWallet(w => w + '+')}>➕</button>
            <button className="mobile-icon-btn" onClick={handlePaste} title="Paste"><CopyIcon /></button>
            <button className="mobile-icon-btn" title="Link"><LinkIcon /></button>
            <button className="mobile-icon-btn" title="Microphone"><MicIcon /></button>
          </div>
        </div>
      </div>
    </div>
  )
}