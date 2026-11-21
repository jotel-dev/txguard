export function makeExample(kind) {
  const suspicious = kind === 'suspicious'
  const unavailable = kind === 'unavailable'
  return {
    mode: 'fixture',
    chain: 'ethereum',
    wallet: 'Illustrative recipient — no real address is accused',
    assessmentType: 'Recipient risk assessment',
    assessedAt: null,
    riskScore: unavailable ? null : suspicious ? 90 : 0,
    riskLabel: unavailable ? 'Insufficient data' : suspicious ? 'High risk' : 'Low observed risk',
    confidence: 'Illustration only',
    balance: 'Not live data',
    totalTransactions: 'Not live data',
    summary: unavailable
      ? 'The provider is unavailable. No security conclusion can be drawn, and no zero-risk score is shown.'
      : suspicious
        ? 'This fixture illustrates a provider-reported phishing indicator. It makes no claim about an actual wallet.'
        : 'This fixture illustrates a complete response with no scored indicators. Absence of detected indicators never guarantees safety.',
    alerts: [
      {
        type: suspicious ? 'danger' : 'info',
        title: unavailable
          ? 'Provider unavailable'
          : suspicious
            ? 'Phishing indicator (fixture)'
            : 'No scored indicators (fixture)',
        text: 'All findings in this example are synthetic and explicitly separate from live scans.',
        evidence: 'demo fixture',
      },
    ],
    sources: [
      { name: 'Synthetic example provider', status: unavailable ? 'unavailable' : 'fixture' },
    ],
    limitations: [
      'Demo fixture, not live blockchain or security intelligence.',
      'This is an address-only assessment, not execution simulation.',
    ],
    recommendations: [
      'Independently verify the recipient and selected network.',
      'Review available evidence before deciding.',
    ],
    signals: [],
  }
}
