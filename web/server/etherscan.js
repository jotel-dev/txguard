import { createCache, fetchJSON } from './http.js'

const CHAIN_IDS = Object.freeze({ ethereum: '1', bnb: '56' })
const ACTIONS = new Set(['balance', 'txlist', 'tokentx'])
const cache = createCache(30000, 150)
const cooldowns = new Map()

export class ExplorerError extends Error {
  constructor(code, retryAfter = null) {
    super('Explorer activity unavailable')
    this.code = code
    this.retryAfter = retryAfter
  }
}

export function explorerFailure(error) {
  switch (error?.code) {
    case 'NOT_CONFIGURED':
      return 'Explorer activity is not configured.'
    case 'RATE_LIMITED':
      return 'The explorer is rate-limited. Retry after a short wait.'
    case 'PLAN_UNSUPPORTED':
      return 'Explorer access is unavailable for this network on the configured plan.'
    case 'INVALID_CREDENTIALS':
      return 'Explorer access needs configuration review.'
    default:
      return 'Explorer activity could not be retrieved.'
  }
}

export async function readEtherscan(address, chain, action) {
  if (!Object.hasOwn(CHAIN_IDS, chain) || !ACTIONS.has(action))
    throw new ExplorerError('UNSUPPORTED_REQUEST')
  const key = process.env.ETHERSCAN_API_KEY
  if (!key || typeof key !== 'string' || !key.trim()) throw new ExplorerError('NOT_CONFIGURED')
  const until = cooldowns.get(chain) || 0
  if (until > Date.now())
    throw new ExplorerError('RATE_LIMITED', Math.ceil((until - Date.now()) / 1000))
  return cache.run(`${chain}:${action}:${address.toLowerCase()}`, async () => {
    const query = new URLSearchParams({
      chainid: CHAIN_IDS[chain],
      module: 'account',
      action,
      address,
      apikey: key,
      ...(action === 'balance'
        ? { tag: 'latest' }
        : { startblock: '0', endblock: '99999999', page: '1', offset: '20', sort: 'desc' }),
    })
    try {
      const data = await fetchJSON(`https://api.etherscan.io/v2/api?${query}`)
      if (data.status === '1') {
        if (
          action === 'balance'
            ? typeof data.result !== 'string' || !/^\d{1,256}$/.test(data.result)
            : !Array.isArray(data.result)
        )
          throw new ExplorerError('INVALID_RESPONSE')
        return action === 'balance' ? data.result : data.result.slice(0, 20)
      }
      if (
        data.status === '0' &&
        data.message === 'No transactions found' &&
        action !== 'balance' &&
        Array.isArray(data.result) &&
        data.result.length === 0
      )
        return []
      const reason = typeof data.result === 'string' ? data.result.toLowerCase() : ''
      if (/rate limit|too many|throttl/.test(reason)) throw new ExplorerError('RATE_LIMITED', 5)
      if (/free api access|upgrade.*plan|not.*supported.*plan/.test(reason))
        throw new ExplorerError('PLAN_UNSUPPORTED')
      if (/invalid api key|missing api key|invalid.*key/.test(reason))
        throw new ExplorerError('INVALID_CREDENTIALS')
      throw new ExplorerError('UPSTREAM_ERROR')
    } catch (error) {
      const normalized =
        error instanceof ExplorerError
          ? error
          : new ExplorerError(
              error?.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
              error?.status === 429 ? Math.min(60, Math.max(1, error.retryAfter || 5)) : null,
            )
      if (normalized.code === 'RATE_LIMITED')
        cooldowns.set(chain, Date.now() + normalized.retryAfter * 1000)
      throw normalized
    }
  })
}
