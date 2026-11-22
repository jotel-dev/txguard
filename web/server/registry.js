import { fetchJSON, createCache } from './http.js'
import { explorerLink } from '../shared/chains.js'

export const CONTRACT = 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry'
const [owner, name] = CONTRACT.split('.')
const cache = createCache(60000)
export function verifyRegistryInterface(data) {
  const fn = data?.functions?.find((fn) => fn.name === 'log-scan' && fn.access === 'public')
  return (
    !!fn &&
    fn.args?.length === 3 &&
    fn.args[0]?.type?.['string-ascii']?.length === 16 &&
    fn.args[1]?.type?.['string-ascii']?.length === 64 &&
    fn.args[2]?.type === 'uint128' &&
    ['get-scan', 'get-scan-count', 'get-total-scans'].every((name) =>
      data.functions.some((fn) => fn.name === name && fn.access === 'read_only'),
    )
  )
}
export async function getRegistryInfo() {
  return cache.run('registry', async () => {
    const data = await fetchJSON(`https://api.hiro.so/v2/contracts/interface/${owner}/${name}`)
    return {
      contract: CONTRACT,
      compatible: verifyRegistryInterface(data),
      explorerUrl: `https://explorer.hiro.so/address/${CONTRACT}?chain=mainnet`,
      checkedAt: new Date().toISOString(),
      note: 'Permissionless public assertions. A registry entry does not independently verify a security assessment.',
    }
  })
}
export function verifyRegistryTransaction(tx) {
  const matches =
    tx.tx_type === 'contract_call' &&
    tx.contract_call?.contract_id === CONTRACT &&
    tx.contract_call?.function_name === 'log-scan'
  const status = !matches
    ? 'Not a TxGuard registry call'
    : tx.tx_status === 'pending'
      ? 'Pending'
      : tx.tx_status !== 'success'
        ? 'Failed or unknown'
        : tx.canonical !== true ||
            tx.is_unanchored !== false ||
            !Number.isInteger(tx.block_height) ||
            tx.block_height <= 0
          ? 'Unconfirmed'
          : 'Confirmed registry call'
  return {
    status,
    verified: status === 'Confirmed registry call',
    matches,
    txid: tx.tx_id,
    submittedBy: tx.sender_address || null,
    blockHeight: tx.block_height || null,
    arguments: matches
      ? (tx.contract_call.function_args || []).slice(0, 3).map((arg) => ({
          name: String(arg.name).slice(0, 32),
          value: String(arg.repr).slice(0, 128),
        }))
      : [],
    explorerUrl: explorerLink('stacks', tx.tx_id, 'tx'),
    note: 'Confirms an anchored successful call to the registry according to Hiro. Inspect its public arguments; this does not bind the entry to your current report or certify the score.',
  }
}
export async function getRegistryReceipt(txid) {
  const tx = await fetchJSON(`https://api.hiro.so/extended/v1/tx/${txid}`)
  if (String(tx.tx_id).replace(/^0x/, '').toLowerCase() !== txid.replace(/^0x/, '').toLowerCase())
    throw new Error('Mismatched transaction')
  return verifyRegistryTransaction(tx)
}
