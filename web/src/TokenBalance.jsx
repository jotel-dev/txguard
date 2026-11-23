import { useState, useEffect, useRef } from 'react'
import { request } from './client.js'
import { isValidAddress } from '../shared/chains.js'
export default function TokenBalance({ report }) {
  const [token, setToken] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function check(event) {
    event.preventDefault()
    controller.current?.abort()
    const task = new AbortController()
    controller.current = task
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const data = await request(
        `/api/token-balance?${new URLSearchParams({ wallet: report.wallet, chain: report.chain, token: token.trim() })}`,
        null,
        task.signal,
      )
      if (!task.signal.aborted) setResult(data)
    } catch (e) {
      if (!task.signal.aborted) setError(e.message)
    } finally {
      if (!task.signal.aborted) setBusy(false)
    }
  }
  return (
    <div className="receipt-tools">
      <h3>Check a token balance</h3>
      <p className="small muted">
        Use the token contract address from its issuer. This checks standard ERC-20 balance and
        decimals; it does not certify a token or discover every asset.
      </p>
      <form onSubmit={check}>
        <label htmlFor="token-contract">Token contract address</label>
        <input
          id="token-contract"
          value={token}
          onChange={(e) => {
            setToken(e.target.value)
            setResult(null)
          }}
          disabled={busy}
          maxLength={42}
        />
        <button
          className="button secondary"
          disabled={busy || !isValidAddress(token.trim(), report.chain)}
        >
          {busy ? 'Checking token…' : 'Check token balance'}
        </button>
      </form>
      {result && (
        <p role="status" className="wrap">
          {result.balance} units · {result.decimals} decimals · chain ID {result.chainId}.{' '}
          {result.note}
        </p>
      )}
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
    </div>
  )
}
