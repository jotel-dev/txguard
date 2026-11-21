import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import './product.css'
import { CHAINS, isValidAddress, walletKey, formatTimestamp } from '../shared/chains.js'
import { request, loadWallets, loadHistory, persist, assessmentOf } from './client.js'
import { makeExample } from './examples.js'
import Icon from './Icon.jsx'
const Report = lazy(() => import('./Report.jsx'))
const Dashboard = lazy(() => import('./Dashboard.jsx'))
const pageFromHash = () =>
  ['dashboard', 'history'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scan'

export default function App() {
  const [page, setPage] = useState(pageFromHash)
  const [chain, setChain] = useState('ethereum')
  const [wallet, setWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState('ETH')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState(loadWallets)
  const [history, setHistory] = useState(loadHistory)
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const scanController = useRef(null)
  const refreshLock = useRef(false)
  const network = CHAINS.find((c) => c.id === chain)
  const valid = wallet.trim() ? isValidAddress(wallet.trim(), chain) : null
  useEffect(() => {
    const navigate = () => {
      setPage(pageFromHash())
      requestAnimationFrame(() => {
        if (['#dashboard', '#history'].includes(location.hash)) window.scrollTo({ top: 0 })
        else document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' })
      })
    }
    window.addEventListener('hashchange', navigate)
    return () => {
      window.removeEventListener('hashchange', navigate)
      scanController.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (!persist('txguard_tracked_wallets', wallets))
      queueMicrotask(() =>
        setNotice(
          'Device storage is unavailable or full. Wallet changes will not survive a reload.',
        ),
      )
  }, [wallets])
  useEffect(() => {
    if (!persist('txguard_scan_history', history))
      queueMicrotask(() =>
        setNotice('Device storage is unavailable or full. Scan history will not survive a reload.'),
      )
  }, [history])
  function edit(nextWallet = wallet, nextChain = chain) {
    scanController.current?.abort()
    setLoading(false)
    setResult(null)
    setError('')
    setWallet(nextWallet)
    setChain(nextChain)
    if (nextChain !== chain) {
      setToken(CHAINS.find((c) => c.id === nextChain).asset)
      setAmount('')
    }
  }
  async function scan(address = wallet, selectedChain = chain) {
    address = address.trim()
    if (!isValidAddress(address, selectedChain)) {
      setError(
        'Enter a valid mainnet address for the selected blockchain. Check its format and checksum.',
      )
      return
    }
    scanController.current?.abort()
    const controller = new AbortController()
    scanController.current = controller
    setWallet(address)
    setChain(selectedChain)
    setResult(null)
    setError('')
    setLoading(true)
    setPage('scan')
    if (location.hash !== '#scan') window.location.assign('#scan')
    try {
      const data = await request(
        '/api/analyze',
        {
          wallet: address,
          chain: selectedChain,
          ...(selectedChain === chain && amount ? { amount, token } : {}),
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setResult(data)
      setHistory((current) =>
        [{ wallet: address, chain: selectedChain, ...assessmentOf(data) }, ...current].slice(0, 20),
      )
      setWallets((current) =>
        current.map((w) =>
          walletKey(w.address, w.chain) === walletKey(address, selectedChain)
            ? { ...w, assessment: assessmentOf(data), error: null }
            : w,
        ),
      )
      requestAnimationFrame(() =>
        document.getElementById('report')?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        }),
      )
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }
  function save(report) {
    if (
      wallets.some((w) => walletKey(w.address, w.chain) === walletKey(report.wallet, report.chain))
    ) {
      setNotice('This wallet is already saved. Its latest assessment has been updated.')
      return
    }
    if (wallets.length >= 30) {
      setNotice('This device already has 30 saved wallets. Remove one to add another.')
      return
    }
    setWallets((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: `${CHAINS.find((c) => c.id === report.chain).label} wallet`,
        address: report.wallet,
        chain: report.chain,
        assessment: assessmentOf(report),
      },
    ])
    setNotice('Wallet saved to your dashboard on this device.')
  }
  async function refresh() {
    if (refreshLock.current) return
    refreshLock.current = true
    setRefreshing(true)
    let failures = 0
    try {
      const snapshot = [...wallets]
      for (let i = 0; i < snapshot.length; i += 2)
        await Promise.all(
          snapshot.slice(i, i + 2).map(async (w) => {
            let assessment = null,
              failure = null
            try {
              assessment = assessmentOf(
                await request('/api/analyze', { wallet: w.address, chain: w.chain }),
              )
            } catch {
              failure = 'Refresh failed. Previous assessment cleared; please retry.'
              failures++
            }
            setWallets((current) =>
              current.map((item) =>
                item.id === w.id ? { ...item, assessment, error: failure } : item,
              ),
            )
          }),
        )
      setNotice(
        failures
          ? `${failures} wallet refresh(es) failed. Retry when the provider is available.`
          : 'Wallet assessments refreshed. Check their timestamps and coverage.',
      )
    } finally {
      refreshLock.current = false
      setRefreshing(false)
    }
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('Address copied.')
    } catch {
      setNotice('Clipboard unavailable. Select and copy the full address manually.')
    }
  }
  function example(kind) {
    scanController.current?.abort()
    setLoading(false)
    setError('')
    if (kind === 'invalid') {
      edit('not-a-wallet', 'ethereum')
      setError('Demo example: this is an invalid Ethereum address. No provider request was made.')
      document.getElementById('wallet')?.focus()
      return
    }
    setResult(makeExample(kind))
    requestAnimationFrame(() =>
      document.getElementById('report')?.scrollIntoView({ block: 'start' }),
    )
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-inner">
          <a className="brand" href="#scan" aria-label="TxGuard home">
            <span className="brand-mark">
              <Icon size={23} />
            </span>
            txguard<span className="brand-version">2.0</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#scan" aria-current={page === 'scan' ? 'page' : undefined}>
              Scan Wallet
            </a>
            <a href="#dashboard" aria-current={page === 'dashboard' ? 'page' : undefined}>
              Dashboard
            </a>
            <a href="#how-it-works">How It Works</a>
            <a href="#history" aria-current={page === 'history' ? 'page' : undefined}>
              History
            </a>
          </nav>
          <a href="#scan" className="nav-cta">
            Check an address
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </header>
      <div className="trust-strip">
        <span>
          <Icon size={14} />
          Public addresses only
        </span>
        <span>No wallet connection</span>
        <span>Free recipient checks</span>
      </div>
      <main id="main" className="container">
        <div className="notice-area" aria-live="polite">
          {notice && (
            <div className="notice">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>
        {page === 'dashboard' ? (
          <Suspense
            fallback={
              <div className="empty" role="status">
                Loading your dashboard…
              </div>
            }
          >
            <Dashboard
              wallets={wallets}
              setWallets={setWallets}
              onScan={scan}
              refresh={refresh}
              refreshing={refreshing}
              copy={copy}
            />
          </Suspense>
        ) : page === 'history' ? (
          <section className="page-section">
            <div className="section-top">
              <div>
                <p className="eyebrow">ON THIS DEVICE</p>
                <h1>Your scan history.</h1>
                <p>The last 20 live assessments. Re-scan for current findings.</p>
              </div>
              <button
                className="button secondary"
                disabled={!history.length}
                onClick={() => {
                  setHistory([])
                  setNotice('Local scan history cleared.')
                }}
              >
                Clear history
              </button>
            </div>
            {!history.length ? (
              <div className="empty panel">
                <Icon name="clock" size={32} />
                <h2>No scans yet</h2>
                <p>Your live assessments will appear here. Demo examples are not saved.</p>
                <a href="#scan" className="button">
                  Scan an address
                  <Icon name="arrow" />
                </a>
              </div>
            ) : (
              <div className="scan-history">
                {history.map((item, i) => (
                  <article className="panel history-row" key={`${item.assessedAt}-${i}`}>
                    <div>
                      <span className={`network-label ${item.chain}`}>
                        {CHAINS.find((c) => c.id === item.chain)?.label}
                      </span>
                      <code>{item.wallet}</code>
                      <p className="small muted">
                        {formatTimestamp(item.assessedAt)} · {item.riskLabel}
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => scan(item.wallet, item.chain)}
                    >
                      Scan again
                      <Icon name="arrow" size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="hero" id="scan" aria-labelledby="hero-title">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <span className="kicker-line" />A LITTLE CLARITY. BEFORE CRYPTO MOVES.
                </div>
                <h1 id="hero-title">
                  Know Before
                  <br />
                  <span>You Send.</span>
                </h1>
                <p className="hero-description">
                  Check wallet addresses, uncover suspicious activity, and understand crypto
                  transaction risks before your money moves.
                </p>
                <div className="hero-actions">
                  <a
                    className="button"
                    href="#wallet"
                    onClick={() => document.getElementById('wallet')?.focus()}
                  >
                    Scan an Address
                    <Icon name="arrow" size={17} />
                  </a>
                  <a className="text-link" href="#how-it-works">
                    How It Works
                    <Icon name="arrow" size={17} />
                  </a>
                </div>
                <div className="hero-proof">
                  <Icon size={18} />
                  <p>
                    For your next payment.
                    <br />
                    <strong>And a more informed decision.</strong>
                  </p>
                </div>
              </div>
              <div className="scan-card">
                <div className="scan-card-heading">
                  <span className="scan-icon">
                    <Icon name="search" size={23} />
                  </span>
                  <div>
                    <h2>Check your recipient</h2>
                    <p>Start with a public wallet address.</p>
                  </div>
                  <span className="live-label">LIVE CHECK</span>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    scan()
                  }}
                  noValidate
                >
                  <label htmlFor="chain">Blockchain</label>
                  <select
                    id="chain"
                    value={chain}
                    onChange={(event) => edit('', event.target.value)}
                  >
                    {CHAINS.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="label-row">
                    <label htmlFor="wallet">Recipient address</label>
                    <button
                      type="button"
                      className="text-button"
                      onClick={async () => {
                        try {
                          edit((await navigator.clipboard.readText()).trim())
                        } catch {
                          setNotice(
                            'Paste unavailable. Please paste directly into the address field.',
                          )
                        }
                      }}
                    >
                      <Icon name="copy" size={13} />
                      Paste
                    </button>
                  </div>
                  <input
                    id="wallet"
                    value={wallet}
                    onChange={(event) => edit(event.target.value)}
                    maxLength={128}
                    placeholder={
                      chain === 'ethereum' || chain === 'bnb'
                        ? '0x…'
                        : chain === 'stacks'
                          ? 'SP… or SP….contract'
                          : chain === 'bitcoin'
                            ? 'bc1…, 1… or 3…'
                            : 'Solana public address'
                    }
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    aria-invalid={valid === false}
                    aria-describedby="address-help"
                  />
                  <p
                    id="address-help"
                    className={valid === false ? 'validation-error small' : 'small muted'}
                  >
                    {valid === false
                      ? `Check the ${network.label} address format and checksum.`
                      : valid
                        ? 'Address format and checksum accepted. Identity is not verified.'
                        : 'Select the network your recipient will use.'}
                  </p>
                  <details className="optional-context">
                    <summary>
                      Transfer context <span>optional</span>
                    </summary>
                    <div className="form-grid">
                      <label htmlFor="token">
                        Asset
                        <select id="token" value={token} onChange={(e) => setToken(e.target.value)}>
                          {[
                            network.asset,
                            ...(['ethereum', 'bnb', 'solana'].includes(chain)
                              ? ['USDT', 'USDC']
                              : []),
                          ].map((asset) => (
                            <option key={asset}>{asset}</option>
                          ))}
                        </select>
                      </label>
                      <label htmlFor="amount">
                        Amount
                        <input
                          id="amount"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          maxLength={50}
                        />
                      </label>
                    </div>
                    <p className="small muted">
                      Context only. Token identity, balances and execution are not simulated.
                    </p>
                  </details>
                  <button className="button scan-submit" disabled={loading || !valid} type="submit">
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Checking available evidence…
                      </>
                    ) : (
                      <>
                        <Icon size={18} />
                        Check address
                        <Icon name="arrow" size={18} />
                      </>
                    )}
                  </button>
                  {error && (
                    <div className="error-note" role="alert">
                      {error}
                      <button type="button" className="text-button" onClick={() => scan()}>
                        Try again
                        <Icon name="refresh" size={14} />
                      </button>
                    </div>
                  )}
                  <p className="scan-footnote">
                    <Icon name="info" size={14} />
                    An address check, not a transaction simulation.
                  </p>
                </form>
                <div className="scan-card-bottom">
                  <span>No seed phrase. No sign-in.</span>
                  <Icon name="shield" size={15} />
                </div>
              </div>
            </section>
            {loading && (
              <div role="status" className="panel loading-panel">
                <span className="spinner" />
                <div>
                  <strong>Checking blockchain and security providers</strong>
                  <p>
                    Unavailable sources will be reported explicitly. You can edit the address to
                    cancel.
                  </p>
                </div>
              </div>
            )}
            {result && (
              <Suspense
                fallback={
                  <div role="status" className="empty">
                    Preparing your report…
                  </div>
                }
              >
                <Report
                  key={result.scanId || `example-${result.riskLabel}`}
                  report={result}
                  save={save}
                  copy={copy}
                />
              </Suspense>
            )}
            <section className="networks" aria-label="Supported blockchains">
              <p className="eyebrow">FIVE NETWORKS. ONE PLACE TO CHECK.</p>
              <div className="network-list">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    className={`network-option ${c.id}`}
                    onClick={() => {
                      edit('', c.id)
                      document.getElementById('wallet')?.focus()
                    }}
                  >
                    <span className="coin-symbol">{c.asset.slice(0, 1)}</span>
                    {c.label}
                    <span className="network-detail">
                      {c.chainId ? 'Activity + security' : 'Activity · limited security'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="why-section">
              <div>
                <span className="eyebrow">A PAUSE THAT MATTERS</span>
                <h2>
                  Crypto moves fast.
                  <br />
                  Take a moment to check.
                </h2>
              </div>
              <div>
                <p>
                  A wrong address, an impersonated client, a suspicious P2P trade. Once funds move,
                  getting them back can be difficult.
                </p>
                <p>
                  TxGuard brings available blockchain activity and security reports into one
                  readable assessment. Built for freelancers, traders and everyday crypto users.
                </p>
                <span className="why-signoff">
                  <Icon size={19} />
                  Check the address. Understand the risk. Decide.
                </span>
              </div>
            </section>
            <section id="how-it-works" className="how-section">
              <div className="section-top">
                <div>
                  <p className="eyebrow">LESS GUESSWORK. MORE CONTEXT.</p>
                  <h2>A clearer check, in three steps.</h2>
                </div>
                <p>
                  You stay in control.
                  <br />
                  TxGuard never moves your funds.
                </p>
              </div>
              <div className="steps">
                {[
                  [
                    '01',
                    'Enter the address',
                    'Choose the right network and paste the full recipient address. No wallet connection needed.',
                  ],
                  [
                    '02',
                    'Look at the evidence',
                    'We retrieve available provider signals and blockchain data. Missing coverage stays visible.',
                  ],
                  [
                    '03',
                    'Decide before you send',
                    'Review indicators, history and limitations. Independently verify the recipient before proceeding.',
                  ],
                ].map(([n, title, text]) => (
                  <article key={n}>
                    <span className="step-number">{n}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
              <div className="limitation-note">
                <Icon name="info" />
                <p>
                  TxGuard assesses recipients using retrieved evidence. It cannot guarantee safety,
                  verify ownership, recover funds, or predict execution from an address alone.
                  Security intelligence currently covers Ethereum and BNB Chain; other networks show
                  activity with explicit limitations.
                </p>
              </div>
            </section>
            <section className="examples-section">
              <div className="section-top">
                <div>
                  <p className="eyebrow">TRY THE EXPERIENCE</p>
                  <h2>Demo examples, clearly labeled.</h2>
                </div>
                <p>
                  Reproducible illustrations.
                  <br />
                  Always separate from live results.
                </p>
              </div>
              <div className="examples-grid">
                {[
                  ['normal', 'No scored indicators', 'What a low observed risk report means.'],
                  [
                    'suspicious',
                    'A reported threat',
                    'How a provider signal changes the assessment.',
                  ],
                  [
                    'invalid',
                    'An invalid address',
                    'A malformed address is rejected before a request.',
                  ],
                  [
                    'unavailable',
                    'An unavailable provider',
                    'Missing intelligence stays insufficient data.',
                  ],
                ].map(([kind, title, text]) => (
                  <button className="example-card" key={kind} onClick={() => example(kind)}>
                    <span className="eyebrow">
                      {kind === 'invalid' ? 'VALIDATION EXAMPLE' : 'SYNTHETIC FIXTURE'}
                    </span>
                    <strong>{title}</strong>
                    <span>{text}</span>
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              </div>
              <p className="small muted">
                For a genuine live check, enter your own public address. Fixtures do not establish
                facts about real wallets.
              </p>
              <div className="public-example panel">
                <div>
                  <p className="eyebrow">DOCUMENTED LIVE EXAMPLE</p>
                  <h3>A publicly documented address</h3>
                  <p className="small muted">
                    This Ethereum address appears in{' '}
                    <a
                      href="https://ofac.treasury.gov/recent-actions/20220414"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OFAC’s April 14, 2022 update
                    </a>
                    . Load it, then run a live check to see what current providers return. The
                    historical source and current findings are separate evidence.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    edit('0x098b716b8aaf21512996dc57eb0615e2383e2f96', 'ethereum')
                    document.getElementById('wallet')?.focus()
                  }}
                >
                  Load documented address
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </section>
            <section className="faq-section">
              <div>
                <p className="eyebrow">GOOD QUESTIONS</p>
                <h2>A little more clarity.</h2>
                <p>Know what a check can tell you.</p>
              </div>
              <div className="faq-list">
                {[
                  [
                    'Does a low score mean an address is safe?',
                    'No. Low observed risk means no scored indicators were returned in the available security fields. Unknown threats and compromised wallets may still be risky.',
                  ],
                  [
                    'Why do some networks show insufficient data?',
                    'Blockchain activity is available on five networks, but our address-security intelligence integration currently covers Ethereum and BNB Chain. Other chains, incomplete responses and outages may not support a score.',
                  ],
                  [
                    'What does a Stacks receipt prove?',
                    'An anchored successful registry call records a submitter’s public assertion about a chain, address and score. It does not verify the underlying assessment. TxGuard can check existing receipt transactions without a wallet.',
                  ],
                  [
                    'Are scans free, and what is saved?',
                    'Scans are free and need no wallet connection. Recent scan summaries and wallets you save are stored on this browser. Clear history or remove wallets at any time. Addresses are shared with the relevant blockchain and security providers; contextual AI receives normalized evidence.',
                  ],
                  [
                    'Can TxGuard simulate a transfer?',
                    'This workflow checks a recipient address. Optional token and amount context does not simulate execution, approvals or a token transfer.',
                  ],
                ].map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <Icon name="plus" size={18} />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <a className="brand" href="#scan">
            <span className="brand-mark">
              <Icon />
            </span>
            txguard
          </a>
          <p>
            Know Before You Send.
            <br />
            <span className="small muted">Evidence helps. Independent verification matters.</span>
          </p>
          <div>
            <a href="https://github.com/jotel-dev/txguard" target="_blank" rel="noreferrer">
              GitHub
              <Icon name="link" size={13} />
            </a>
            <a
              href="https://github.com/jotel-dev/txguard/issues/new"
              target="_blank"
              rel="noreferrer"
            >
              Report an issue
              <Icon name="link" size={13} />
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>Built for a more informed Web3.</span>
          <span>Never share your private keys or seed phrase.</span>
        </div>
      </footer>
    </>
  )
}
