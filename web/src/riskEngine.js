// ── TxGuard Risk Scoring Engine ──
// Combines GoPlus security data + behavioral analysis into a risk score

// ── GoPlus Security Check (no API key needed) ──
export async function goplusCheck(address, chain) {
  // GoPlus chain IDs
  const chainIds = {
    ethereum: '1',
    bnb: '56',
    solana: 'solana',
    bitcoin: 'bitcoin'
  }

  try {
    const chainId = chainIds[chain] || '1'

    // For EVM chains
    if (chain === 'ethereum' || chain === 'bnb') {
      const res = await fetch(
        `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=${chainId}`,
        { headers: { 'accept': 'application/json' } }
      )
      const data = await res.json()
      const result = data.result || {}

      return {
        isBlacklisted:      result.blacklist_doubt === '1',
        isMalicious:        result.malicious_address === '1',
        isPhishing:         result.phishing_activities === '1',
        isFakeToken:        result.fake_token === '1',
        isHoneypot:         result.honeypot_related_address === '1',
        isMixer:            result.mixer === '1',
        isDataTheft:        result.data_theft === '1',
        isRansomware:       result.ransomware === '1',
        isStealer:          result.stealing_attack === '1',
        isContractAddress:  result.contract_address === '1',
        isApprovalAbuse:    result.gas_abuse === '1',
        flags: buildFlags(result),
        raw: result
      }
    }

    // For Stacks — GoPlus has limited/no support
    if (chain === 'stacks') {
      return {
        isBlacklisted: false,
        isMalicious: false,
        flags: [{ severity: 'info', label: 'Stacks Local Fallback' }],
        note: 'Stacks Address Security is evaluated via TxGuard AI and on-chain behavioral engine. GoPlus DB check bypassed.',
        raw: {}
      }
    }

    return { isBlacklisted: false, isMalicious: false, flags: [], raw: {} }

  } catch (e) {
    console.warn('GoPlus check failed:', e)
    return { isBlacklisted: false, isMalicious: false, flags: [{ severity: 'warn', label: 'GoPlus API Offline' }], raw: {} }
  }
}

function buildFlags(result) {
  const flags = []
  if (result.blacklist_doubt     === '1') flags.push({ severity: 'critical', label: 'Blacklisted Address' })
  if (result.malicious_address   === '1') flags.push({ severity: 'critical', label: 'Known Malicious Address' })
  if (result.phishing_activities === '1') flags.push({ severity: 'critical', label: 'Phishing Activity Detected' })
  if (result.fake_token          === '1') flags.push({ severity: 'high',     label: 'Fake Token Activity' })
  if (result.honeypot_related_address === '1') flags.push({ severity: 'high', label: 'Honeypot Related' })
  if (result.mixer               === '1') flags.push({ severity: 'high',     label: 'Mixer / Tumbler Usage' })
  if (result.ransomware          === '1') flags.push({ severity: 'critical', label: 'Ransomware Association' })
  if (result.stealing_attack     === '1') flags.push({ severity: 'critical', label: 'Stealing Attack' })
  if (result.data_theft          === '1') flags.push({ severity: 'high',     label: 'Data Theft Activity' })
  if (result.gas_abuse           === '1') flags.push({ severity: 'medium',   label: 'Approval Abuse / Gas Drain' })
  return flags
}

// ── Behavioral Risk Scorer ──
export function scoreBehavior(onchainData, chain) {
  let score = 0
  const signals = []

  if (!onchainData) return { score: 30, signals: ['Unable to fetch on-chain data'] }

  const txCount    = parseInt(String(onchainData.totalTransactions || '').replace(/[^0-9]/g, ''), 10) || 0
  const balanceRaw = onchainData.balanceRaw || 0
  const walletAge  = onchainData.walletAge  || 'Unknown'

  // ── New wallet with high balance = risk ──
  if (walletAge.includes('day') && balanceRaw > 1) {
    score += 20
    signals.push('New wallet with significant balance')
  }

  // ── Zero transactions ──
  if (txCount === 0 && balanceRaw > 0) {
    score += 10
    signals.push('Wallet has balance but no outgoing transactions')
  }

  // ── Very high tx count could indicate bot ──
  if (txCount > 10000) {
    score += 15
    signals.push('Unusually high transaction volume — possible bot activity')
  }

  // ── Empty wallet ──
  if (balanceRaw === 0 && txCount === 0) {
    score += 5
    signals.push('Empty wallet with no activity')
  }

  // ── Old wallet with activity = generally safer ──
  if (walletAge.includes('year') && txCount > 10) {
    score -= 10
    signals.push('Established wallet with long history')
  }

  // ── Healthy active wallet ──
  if (txCount > 5 && txCount < 1000 && balanceRaw > 0) {
    score -= 5
    signals.push('Normal wallet activity pattern')
  }

  return {
    score: Math.max(0, Math.min(50, score)), // behavioral max is 50
    signals
  }
}

// ── Master Risk Calculator ──
export async function calculateRisk(address, chain, onchainData) {
  // Run GoPlus check
  const security = await goplusCheck(address, chain)

  // Run behavioral scoring
  const behavior = scoreBehavior(onchainData, chain)

  // ── Base score from GoPlus flags ──
  let goplusScore = 0
  if (security.isMalicious)  goplusScore += 80
  if (security.isBlacklisted) goplusScore += 80
  if (security.isPhishing)   goplusScore += 75
  if (security.isRansomware) goplusScore += 85
  if (security.isStealer)    goplusScore += 80
  if (security.isMixer)      goplusScore += 40
  if (security.isHoneypot)   goplusScore += 50
  if (security.isFakeToken)  goplusScore += 45
  if (security.isDataTheft)  goplusScore += 60
  if (security.isApprovalAbuse) goplusScore += 30

  // ── Final score = GoPlus (weighted 70%) + Behavior (30%) ──
  const finalScore = goplusScore > 0
    ? Math.round(Math.min(100, goplusScore + behavior.score * 0.3))
    : Math.round(Math.min(100, Math.max(0, behavior.score)))

  // ── Build security alerts from real data ──
  const alerts = []

  // GoPlus alerts (highest priority)
  security.flags.forEach(flag => {
    if (flag.label === 'Stacks Local Fallback') {
      alerts.push({
        type: 'info',
        icon: 'ℹ️',
        title: 'Stacks Mainnet Evaluation',
        text: 'Threat analysis relies on TxGuard local risk engine and Llama-3 AI. GoPlus Security DB does not support Stacks.'
      })
    } else {
      alerts.push({
        type:  flag.severity === 'critical' ? 'danger' : flag.severity === 'high' ? 'warn' : 'info',
        icon:  flag.severity === 'critical' ? '🔴' : '⚠️',
        title: flag.label,
        text:  `Detected by GoPlus Security database. Exercise extreme caution.`
      })
    }
  })

  // Behavioral alerts
  behavior.signals.forEach(signal => {
    const isPositive = signal.includes('Established') || signal.includes('Normal')
    alerts.push({
      type:  isPositive ? 'safe' : 'warn',
      icon:  isPositive ? '✅' : '⚠️',
      title: isPositive ? 'Positive Signal' : 'Behavioral Flag',
      text:  signal
    })
  })

  // Add default safe alert if no flags
  if (alerts.length === 0) {
    alerts.push({
      type: 'safe', icon: '✅',
      title: 'No Known Threats',
      text: 'This address is not flagged in the GoPlus security database.'
    })
    alerts.push({
      type: 'info', icon: 'ℹ️',
      title: 'AI Analysis Only',
      text: 'Security assessment is based on behavioral patterns and AI analysis.'
    })
  }

  // ── Risk label ──
  let riskLabel = 'SAFE'
  if (finalScore > 75)      riskLabel = 'DANGEROUS'
  else if (finalScore > 50) riskLabel = 'SUSPICIOUS'
  else if (finalScore > 25) riskLabel = 'CAUTION'

  return {
    riskScore:  Math.round(finalScore),
    riskLabel,
    alerts:     alerts.slice(0, 5), // max 5 alerts
    goplusData: security,
    behavioral: behavior
  }
}