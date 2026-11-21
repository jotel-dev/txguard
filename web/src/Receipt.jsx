import { useState } from 'react'
import { request } from './client.js'
import Icon from './Icon.jsx'
const contract = 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry'

export default function Receipt({ report }) {
  const [txid,setTxid] = useState('')
  const [receipt,setReceipt] = useState(null)
  const [registry,setRegistry] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function check(event) {
    event.preventDefault(); setBusy(true); setError(''); setReceipt(null)
    try { setReceipt(await request(`/api/registry?${new URLSearchParams({txid:txid.trim()})}`)) } catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function checkRegistry() {
    setBusy(true); setError('')
    try { setRegistry(await request('/api/registry')) } catch(e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <div className="receipt-tools">
    <p className="small muted">Local SHA-256 evidence commitment (not signed):</p><code className="commitment">{report.commitment}</code>
    <p>The existing registry publishes the chain, full recipient address, score and submitting principal. Entries are public user assertions and can be duplicated. It does not store the full report or its evidence hash.</p>
    <a className="text-link" href={`https://explorer.hiro.so/address/${contract}?chain=mainnet`} target="_blank" rel="noreferrer">Inspect registry contract<Icon name="link" size={14}/></a>
    <button className="button secondary" disabled={busy} onClick={checkRegistry}>Check deployed contract</button>{registry && <p role="status">{registry.compatible?'Compatible registry interface verified.':'The deployed interface could not be verified as compatible.'} Checked {registry.checkedAt}.</p>}
    <form onSubmit={check}><label htmlFor="receipt-id">Existing Stacks receipt transaction ID</label><input id="receipt-id" value={txid} onChange={e=>setTxid(e.target.value)} maxLength={66} placeholder="0x… (64 hexadecimal characters)" required/><button className="button secondary" disabled={busy || !/^(?:0x)?[\da-fA-F]{64}$/.test(txid.trim())}>Verify receipt</button></form>
    {receipt && <div role="status" className="answer"><strong>{receipt.status}</strong><p>{receipt.note}</p>{receipt.arguments?.map((arg,i)=><p className="small wrap" key={i}>{arg.name}: {arg.value}</p>)}{receipt.explorerUrl && <a href={receipt.explorerUrl} target="_blank" rel="noreferrer">View transaction on Stacks explorer</a>}</div>}
    <p className="small muted">Receipt tools are read-only. No wallet connection or network fee is needed. Creating new mainnet records is outside this release.</p>
    {error && <p className="error-note" role="alert">{error}</p>}
  </div>
}
