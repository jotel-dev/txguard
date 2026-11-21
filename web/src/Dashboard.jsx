import { useState } from 'react'
import { CHAINS, isValidAddress, walletKey, formatTimestamp } from '../shared/chains.js'
import Icon from './Icon.jsx'

export default function Dashboard({ wallets, setWallets, onScan, refresh, refreshing, copy }) {
  const [query, setQuery] = useState('')
  const [network, setNetwork] = useState('all')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  function add(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const address = data.get('address').trim()
    const chain = data.get('chain')
    if (!isValidAddress(address, chain)) return setError('Enter a valid address for the selected mainnet network.')
    if (wallets.some(w => walletKey(w.address,w.chain) === walletKey(address,chain))) return setError('This wallet is already saved.')
    if (wallets.length >= 30) return setError('You can save up to 30 wallets on this device.')
    setWallets(current => [...current, { id: crypto.randomUUID(), label: data.get('label').trim() || 'Saved wallet', address, chain, assessment: null }])
    setAdding(false); setError('')
  }
  const shown = wallets.filter(w => (network === 'all' || w.chain === network) && `${w.label} ${w.address}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="page-section" aria-labelledby="dashboard-title">
    <div className="section-top"><div><p className="eyebrow">YOUR WATCHLIST</p><h1 id="dashboard-title">A clearer view of your wallets.</h1><p>Saved on this device. Refresh when you need a current assessment.</p></div><div className="actions"><button className="button secondary" onClick={refresh} disabled={refreshing || !wallets.length}><Icon name="refresh"/>{refreshing ? 'Refreshing…' : 'Refresh all'}</button><button className="button" onClick={()=>setAdding(!adding)}><Icon name="plus"/>Add wallet</button></div></div>
    {adding && <form className="panel add-form" onSubmit={add}>
      <h2>Save a public address</h2>
      <div className="form-grid"><label>Wallet label<input name="label" maxLength={60} placeholder="Freelance payments"/></label><label>Blockchain<select name="chain">{CHAINS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div>
      <label>Public address<input name="address" required maxLength={128} spellCheck="false" autoCapitalize="none" autoComplete="off" placeholder="Paste the full address"/></label>
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="actions"><button type="submit" className="button">Save wallet</button><button type="button" className="button secondary" onClick={()=>setAdding(false)}>Cancel</button></div>
    </form>}
    <div className="filters"><label className="search-field"><Icon name="search"/><span className="sr-only">Search saved wallets</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search wallets or addresses"/></label><label><span className="sr-only">Filter by blockchain</span><select value={network} onChange={e=>setNetwork(e.target.value)}><option value="all">All networks</option>{CHAINS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div>
    {!shown.length && <div className="empty panel"><Icon name="wallet" size={32}/><h2>{wallets.length ? 'No matching wallets' : 'Your watchlist starts here'}</h2><p>Add an address or save one after a live scan. No wallet connection needed.</p></div>}
    <div className="wallet-grid">{shown.map(w=><article className="panel wallet-card" key={w.id}><div className="card-top"><span className={`network-label ${w.chain}`}>{CHAINS.find(c=>c.id===w.chain)?.label}</span><button className="icon-button" aria-label={`Remove ${w.label}`} onClick={()=>setWallets(current=>current.filter(item=>item.id!==w.id))}><Icon name="close" size={16}/></button></div><h2>{w.label}</h2><button className="address-copy" title={w.address} onClick={()=>copy(w.address)}><span>{w.address.slice(0,10)}…{w.address.slice(-8)}</span><Icon name="copy" size={14}/></button><div className="wallet-metrics"><div><span className="muted small">Last known balance</span><strong>{w.assessment?.balance || 'Not scanned'}</strong></div><div><span className="muted small">Latest assessment</span><strong>{w.assessment?.riskLabel || 'Not scanned'}</strong></div></div><p className="small muted">{w.error || (w.assessment ? `Last scan: ${formatTimestamp(w.assessment.assessedAt)}` : 'No current evidence yet.')}</p><button className="button secondary wide" disabled={refreshing} onClick={()=>onScan(w.address,w.chain)}>Scan wallet<Icon name="arrow" size={16}/></button></article>)}</div>
  </section>
}
