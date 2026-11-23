import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import { isValidAddress } from './chains.js'

// Versioned fixed schema: object insertion order and external metadata cannot alter serialization.
export function normalizeAssessment(report) {
  if (
    report?.mode !== 'live' ||
    !isValidAddress(report.wallet, report.chain) ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(report.scanId || '') ||
    report.policy !== 'txguard-evidence-v2' ||
    !Number.isFinite(Date.parse(report.assessedAt)) ||
    !(
      report.riskScore === null ||
      (Number.isInteger(report.riskScore) && report.riskScore >= 0 && report.riskScore <= 100)
    ) ||
    !Array.isArray(report.signals) ||
    !Array.isArray(report.sources) ||
    report.signals.length > 50 ||
    report.signals.some((s) => !/^[a-z_]{1,64}$/.test(s?.id || '')) ||
    report.sources.length > 10 ||
    report.sources.some(
      (s) =>
        typeof s?.name !== 'string' ||
        s.name.length > 100 ||
        !['available', 'partial', 'unavailable', 'unsupported'].includes(s.status),
    )
  )
    throw new Error('A valid live assessment is required.')
  return {
    schema: 'txguard-receipt-v1',
    scanId: report.scanId.toLowerCase(),
    assessedAt: new Date(report.assessedAt).toISOString(),
    policy: report.policy,
    network: report.chain,
    wallet: ['ethereum', 'bnb'].includes(report.chain)
      ? report.wallet.toLowerCase()
      : report.wallet,
    riskScore: report.riskScore,
    signals: [...new Set(report.signals.map((s) => s.id))].sort(),
    coverage: report.sources
      .map((s) => ({ name: s.name, status: s.status }))
      .sort((a, b) =>
        JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0,
      ),
  }
}

export function receiptDigest(assessment, nonce) {
  if (!/^[\da-f]{64}$/.test(nonce)) throw new Error('A 32-byte private nonce is required.')
  return bytesToHex(
    sha256(
      new TextEncoder().encode(JSON.stringify({ domain: 'txguard:receipt:v1', assessment, nonce })),
    ),
  )
}

export function prepareReceipt(report, nonce) {
  const assessment = normalizeAssessment(report)
  return { assessment, nonce, commitment: receiptDigest(assessment, nonce) }
}

export function verifyReceiptPackage(bundle) {
  try {
    return (
      typeof bundle?.commitment === 'string' &&
      receiptDigest(bundle.assessment, bundle.nonce) === bundle.commitment
    )
  } catch {
    return false
  }
}
