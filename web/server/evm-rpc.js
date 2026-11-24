import { fetchJSON, createCache } from './http.js'
import { isValidAddress, formatUnits } from '../shared/chains.js'
const providers = {
  ethereum: { url: 'https://ethereum-rpc.publicnode.com', chainId: '0x1' },
  bnb: { url: 'https://bsc-dataseed.bnbchain.org', chainId: '0x38' },
}
const cache = createCache(30000, 100)
async function rpc(chain, method, params) {
  const data = await fetchJSON(providers[chain].url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (data.error || data.id !== 1 || data.jsonrpc !== '2.0' || typeof data.result !== 'string')
    throw new Error('Invalid RPC response')
  return data.result
}
async function verifyChain(chain) {
  if (
    !Object.hasOwn(providers, chain) ||
    (await rpc(chain, 'eth_chainId', [])) !== providers[chain].chainId
  )
    throw new Error('Wrong RPC network')
}
export async function bnbNativeBalance(wallet) {
  if (!isValidAddress(wallet, 'bnb')) throw new Error('Invalid wallet')
  return cache.run(`bnb:${wallet.toLowerCase()}`, async () => {
    await verifyChain('bnb')
    const value = await rpc('bnb', 'eth_getBalance', [wallet, 'latest'])
    if (!/^0x[\da-f]{1,64}$/i.test(value)) throw new Error('Invalid balance')
    return formatUnits(BigInt(value), 18)
  })
}
export async function evmTokenBalance(wallet, chain, token) {
  if (
    !Object.hasOwn(providers, chain) ||
    !isValidAddress(wallet, chain) ||
    !isValidAddress(token, chain)
  )
    throw new Error('Invalid token request')
  return cache.run(`${chain}:${wallet.toLowerCase()}:${token.toLowerCase()}`, async () => {
    await verifyChain(chain)
    const [raw, decimalsRaw] = await Promise.all([
      rpc(chain, 'eth_call', [
        { to: token, data: `0x70a08231${wallet.slice(2).toLowerCase().padStart(64, '0')}` },
        'latest',
      ]),
      rpc(chain, 'eth_call', [{ to: token, data: '0x313ce567' }, 'latest']),
    ])
    if (![raw, decimalsRaw].every((value) => /^0x[\da-f]{64}$/i.test(value)))
      throw new Error('Unsupported token response')
    const decimals = Number(BigInt(decimalsRaw))
    const balance = formatUnits(BigInt(raw), decimals)
    if (balance === null) throw new Error('Unsupported token decimals')
    return {
      chain,
      chainId: chain === 'bnb' ? 56 : 1,
      token,
      decimals,
      balance,
      source: new URL(providers[chain].url).hostname,
      note: 'Contract-reported balance; not token legitimacy or spendability. Nonstandard tokens may be unsupported.',
    }
  })
}
