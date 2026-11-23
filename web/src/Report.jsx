import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { CHAINS, explorerLink, formatTimestamp } from '../shared/chains.js'
import { request } from './client.js'
import Icon from './Icon.jsx'
const Receipt = lazy(() => import('./Receipt.jsx'))
const TokenBalance = lazy(() => import('./TokenBalance.jsx'))

export default function Report({ report, save, copy }) {
  const [tab, setTab] = useState('report')
  const [transactions, setTransactions] = useState(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [asking, setAsking] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [speechStatus, setSpeechStatus] = useState('')
  const historyController = useRef(null)
  const chatController = useRef(null)
  const speechController = useRef(null)
  const speechAudio = useRef(null)
  useEffect(
    () => () => {
      historyController.current?.abort()
      chatController.current?.abort()
      speechController.current?.abort()
      window.speechSynthesis?.cancel()
      speechAudio.current?.pause()
    },
    [],
  )
  const fixture = report.mode === 'fixture'
  const category =
    report.riskScore === null
      ? 'unknown'
      : report.riskScore >= 76
        ? 'high'
        : report.riskScore >= 26
          ? 'caution'
          : 'low'
  async function history() {
    setTab('transactions')
    if (fixture || txLoading) return
    historyController.current?.abort()
    const controller = new AbortController()
    historyController.current = controller
    setTxLoading(true)
    setTxError('')
    try {
      const data = await request(
        `/api/transactions?${new URLSearchParams({ wallet: report.wallet, chain: report.chain })}`,
        null,
        controller.signal,
      )
      if (!controller.signal.aborted) setTransactions(data)
    } catch (e) {
      if (!controller.signal.aborted) setTxError(e.message)
    } finally {
      if (!controller.signal.aborted) setTxLoading(false)
    }
  }
  async function ask(event) {
    event.preventDefault()
    if (asking || fixture || !question.trim()) return
    const controller = new AbortController()
    chatController.current = controller
    setAsking(true)
    setAnswer(null)
    try {
      const data = await request(
        '/api/ask',
        {
          scanId: report.scanId,
          wallet: report.wallet,
          chain: report.chain,
          question: question.trim(),
        },
        controller.signal,
      )
      if (!controller.signal.aborted) setAnswer(data)
    } catch (e) {
      if (!controller.signal.aborted)
        setAnswer({ answer: e.message, source: 'Explanation unavailable' })
    } finally {
      if (!controller.signal.aborted) setAsking(false)
    }
  }
  async function listen() {
    window.speechSynthesis?.cancel()
    speechAudio.current?.pause()
    speechController.current?.abort()
    if (speechStatus === 'Reading…') {
      setSpeechStatus('')
      return
    }
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(report.summary)
      utterance.onend = () => setSpeechStatus('')
      utterance.onerror = () =>
        setSpeechStatus('Speech unavailable. Your device reader can read this summary.')
      setSpeechStatus('Reading…')
      window.speechSynthesis.speak(utterance)
    } else {
      const controller = new AbortController()
      speechController.current = controller
      try {
        setSpeechStatus('Reading…')
        const chunks = report.summary.match(/.{1,150}(?:\s|$)|.{1,150}/g) || []
        for (const chunk of chunks) {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: chunk.trim() }),
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
          })
          if (!response.ok) throw new Error('Speech unavailable')
          const url = URL.createObjectURL(await response.blob())
          try {
            const audio = new Audio(url)
            speechAudio.current = audio
            await new Promise((resolve, reject) => {
              audio.onended = resolve
              audio.onerror = reject
              controller.signal.addEventListener(
                'abort',
                () => {
                  audio.pause()
                  reject(new Error('Cancelled'))
                },
                { once: true },
              )
              audio.play().catch(reject)
            })
          } finally {
            URL.revokeObjectURL(url)
          }
        }
        if (!controller.signal.aborted) setSpeechStatus('')
      } catch {
        if (!controller.signal.aborted)
          setSpeechStatus('Audio unavailable. Your device reader can read this summary.')
      }
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `txguard-${report.scanId || 'example'}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section id="report" className="report-section" aria-labelledby="report-title">
      <div className="section-top">
        <div>
          <p className="eyebrow">
            {fixture ? 'DEMO EXAMPLE · SYNTHETIC DATA' : 'YOUR RECIPIENT ASSESSMENT'}
          </p>
          <h2 id="report-title">The findings, in plain sight.</h2>
        </div>
        <div className="actions">
          {!fixture && (
            <button className="button secondary" onClick={() => save(report)}>
              <Icon name="plus" />
              Save wallet
            </button>
          )}
          <button className="button secondary" onClick={download}>
            Download report
          </button>
        </div>
      </div>
      {fixture && (
        <p className="demo-banner" role="status">
          Demo fixture. These results are synthetic and are not live intelligence about an actual
          address.
        </p>
      )}
      <div className="panel report-panel">
        <div className="report-meta">
          <span className={`network-label ${report.chain}`}>
            {CHAINS.find((c) => c.id === report.chain)?.label}
          </span>
          <span>{fixture ? 'Illustration only' : formatTimestamp(report.assessedAt)}</span>
          <span>Address-only assessment</span>
        </div>
        <div className="report-address">
          <code>{report.wallet}</code>
          {!fixture && (
            <button
              className="icon-button"
              aria-label="Copy scanned address"
              onClick={() => copy(report.wallet)}
            >
              <Icon name="copy" />
            </button>
          )}
        </div>
        <div className="report-tabs" role="group" aria-label="Report sections">
          <button aria-pressed={tab === 'report'} onClick={() => setTab('report')}>
            Security report
          </button>
          <button aria-pressed={tab === 'transactions'} onClick={history}>
            Transaction history
          </button>
        </div>
        {tab === 'report' ? (
          <>
            <div className={`risk-overview ${category}`}>
              <div className="score-block">
                <span className="eyebrow">OBSERVED RISK</span>
                <strong className="risk-number">
                  {report.riskScore === null ? '—' : report.riskScore}
                  <small>{report.riskScore === null ? 'No score' : '/ 100'}</small>
                </strong>
                <span className="risk-category">{report.riskLabel}</span>
                <span className="small muted">Severity index, not a probability</span>
              </div>
              <div className="risk-summary">
                <div className="section-top compact">
                  <h3>What this means for you</h3>
                  <button className="text-button" onClick={listen}>
                    <Icon name="speaker" size={16} />
                    {speechStatus === 'Reading…' ? 'Stop reading' : 'Listen'}
                  </button>
                </div>
                <p>{report.summary}</p>
                <p className="small muted">{report.confidence}. No assessment guarantees safety.</p>
                <span role="status" className="small muted">
                  {speechStatus}
                </span>
              </div>
            </div>
            <div className="report-stats">
              <div>
                <span className="eyebrow">NATIVE BALANCE</span>
                <strong>{report.balance}</strong>
              </div>
              <div>
                <span className="eyebrow">CONFIRMED TX COUNT</span>
                <strong>{report.totalTransactions}</strong>
              </div>
              <div>
                <span className="eyebrow">COVERAGE</span>
                <strong>
                  {report.sources.filter((s) => s.status === 'available').length} available sources
                </strong>
              </div>
            </div>
            <div className="report-columns">
              <div>
                <h3>Security indicators</h3>
                <div className="indicator-list">
                  {report.alerts.map((alert, i) => (
                    <article key={i} className={`indicator ${alert.type}`}>
                      <Icon name={alert.type === 'danger' ? 'shield' : 'info'} size={19} />
                      <div>
                        <h4>{alert.title}</h4>
                        <p>{alert.text}</p>
                        <span className="evidence-tag">{alert.evidence}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <aside className="precautions">
                <h3>Before you decide</h3>
                <ol>
                  {report.recommendations.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ol>
                <p className="small muted">
                  Recipient checks cannot predict whether a transfer will execute or recover funds
                  already sent.
                </p>
              </aside>
            </div>
            <div className="coverage-panel">
              <h3>Sources & limitations</h3>
              {report.sources.map((source, i) => (
                <div className="source-row" key={i}>
                  <div>
                    <span>{source.name}</span>
                    {source.note && <p className="small muted">{source.note}</p>}
                  </div>
                  <span className={`source-status ${source.status}`}>{source.status}</span>
                </div>
              ))}
              <ul>
                {report.limitations.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              {!fixture && (
                <a
                  href={explorerLink(report.chain, report.wallet)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Inspect address on explorer
                  <Icon name="link" size={15} />
                </a>
              )}
            </div>
            {!fixture && (
              <>
                <form className="chat-panel" onSubmit={ask}>
                  <div>
                    <p className="eyebrow">ASK TXGUARD AI</p>
                    <h3>Make sense of the evidence.</h3>
                    <p>
                      Ask about this report. Explanations fall back to verified findings if AI is
                      unavailable.
                    </p>
                  </div>
                  <label htmlFor="question">Your question</label>
                  <div className="ask-row">
                    <input
                      id="question"
                      maxLength={500}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Why is the coverage limited?"
                    />
                    <button className="button" disabled={asking || !question.trim()}>
                      {asking ? 'Explaining…' : 'Ask TxGuard'}
                    </button>
                  </div>
                  {answer && (
                    <div className="answer" role="status">
                      <span className="eyebrow">{answer.source}</span>
                      <p>{answer.answer}</p>
                      {answer.assessedAt && (
                        <p className="small muted">
                          Evidence checked: {formatTimestamp(answer.assessedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </form>
                <div className="receipt-panel">
                  <div>
                    <Icon name="shield" />
                    <h3>Scan record & Stacks receipts</h3>
                  </div>
                  <p>
                    A downloaded report includes a local evidence hash. It is not an onchain receipt
                    or proof that the assessment is correct.
                  </p>
                  <button className="button secondary" onClick={() => setReceiptOpen(!receiptOpen)}>
                    {receiptOpen ? 'Close receipt tools' : 'View receipt tools'}
                    <Icon name="arrow" size={16} />
                  </button>
                  {receiptOpen && (
                    <Suspense fallback={<p role="status">Loading receipt tools…</p>}>
                      <Receipt report={report} />
                    </Suspense>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="history-panel">
            {fixture ? (
              <div className="empty">
                <Icon name="info" />
                <h3>No live history in this example</h3>
                <p>Start a live scan to retrieve actual blockchain activity.</p>
              </div>
            ) : (
              <>
                <div className="section-top compact">
                  <h3>Recent blockchain activity</h3>
                  <button className="button secondary" onClick={history} disabled={txLoading}>
                    <Icon name="refresh" size={16} />
                    Refresh history
                  </button>
                </div>
                {['ethereum', 'bnb'].includes(report.chain) && (
                  <Suspense fallback={<p>Loading token tools…</p>}>
                    <TokenBalance report={report} />
                  </Suspense>
                )}
                {txLoading && (
                  <div className="skeleton-stack" role="status">
                    <p>Retrieving blockchain activity…</p>
                    <div className="skeleton" />
                    <div className="skeleton" />
                  </div>
                )}
                {txError && (
                  <div role="alert" className="error-note">
                    {txError}{' '}
                    <a
                      href={explorerLink(report.chain, report.wallet)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View explorer
                    </a>
                  </div>
                )}
                {!txLoading && !txError && transactions && (
                  <>
                    {transactions.limitations?.map((text) => (
                      <p key={text} className="small muted">
                        {text}
                      </p>
                    ))}
                    {!transactions.transactions.length && (
                      <p className="empty">
                        The provider returned no recent transactions. This does not establish
                        absence of risk.
                      </p>
                    )}
                    <div className="transaction-list">
                      {transactions.transactions.map((tx, i) => (
                        <article className="transaction" key={`${tx.hash}-${i}`}>
                          <div className="card-top">
                            <a
                              className="tx-hash"
                              href={explorerLink(report.chain, tx.hash, 'tx')}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {tx.hash.slice(0, 12)}…{tx.hash.slice(-8)}
                              <Icon name="link" size={14} />
                            </a>
                            <span className="transaction-status">{tx.status}</span>
                          </div>
                          <p className="small muted">{tx.kind}</p>
                          <dl>
                            <div>
                              <dt>From</dt>
                              <dd>{tx.from || 'Multiple or unavailable'}</dd>
                            </div>
                            <div>
                              <dt>To</dt>
                              <dd>{tx.to || 'Multiple or unavailable'}</dd>
                            </div>
                            <div>
                              <dt>Amount</dt>
                              <dd>
                                {tx.amount === null ? 'Not decoded' : `${tx.amount} ${tx.asset}`}
                              </dd>
                            </div>
                            <div>
                              <dt>Time</dt>
                              <dd>{formatTimestamp(tx.timestamp)}</dd>
                            </div>
                          </dl>
                          {tx.statusDetails && <p className="small muted">{tx.statusDetails}</p>}
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
