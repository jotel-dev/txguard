import { formatUnits, walletKey, isValidAddress } from '../shared/chains.js'
import { fetchJSON, createCache } from '../server/http.js'
import { readEtherscan } from '../server/etherscan.js'

/** @typedef {{hash:string,from:string|null,to:string|null,amount:string|null,asset:string,timestamp:number|null,status:string,kind?:string,statusDetails?:string}} Transaction */
const historyCache = createCache(30000)
const RPC = 'https://api.mainnet-beta.solana.com'
const HIRO = 'https://api.hiro.so'
const timestamp = (seconds) =>
  Number.isFinite(Number(seconds)) && Number(seconds) > 0 ? Number(seconds) * 1000 : null
const uint = (value) => /^\d+$/.test(String(value))
const addressValue = (value, chain) =>
  typeof value === 'string' && isValidAddress(value, chain) ? value : null
const requireArray = (value) => {
  if (!Array.isArray(value)) throw new Error('Invalid provider list')
  return value
}

async function etherscan(address, chain, action) {
  return readEtherscan(address, chain, action)
}
async function solana(method, params) {
  const data = await fetchJSON(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (data.error || !Object.hasOwn(data, 'result')) throw new Error('RPC unavailable')
  return data.result
}

export function parseEvmTransaction(tx, chain, token = false) {
  if (!/^0x[\da-fA-F]{64}$/.test(tx.hash || '')) throw new Error('Invalid transaction hash')
  const tokenDecimals = /^(?:0|[1-9]\d?)$/.test(String(tx.tokenDecimal))
    ? Number(tx.tokenDecimal)
    : NaN
  const amount = formatUnits(tx.value, token ? tokenDecimals : 18)
  const confirmations = uint(tx.confirmations) ? BigInt(tx.confirmations) : null
  const status =
    tx.isError === '1' || tx.txreceipt_status === '0'
      ? 'Failed'
      : confirmations === 0n
        ? 'Pending'
        : confirmations !== null && confirmations > 0n && (token || tx.txreceipt_status === '1')
          ? 'Confirmed'
          : 'Unknown'
  return {
    hash: tx.hash,
    from: addressValue(tx.from, chain),
    to: addressValue(tx.to, chain),
    amount,
    asset: token
      ? `Token (${addressValue(tx.contractAddress, chain) || 'identity unavailable'})`
      : chain === 'bnb'
        ? 'BNB'
        : 'ETH',
    timestamp: timestamp(tx.timeStamp),
    status,
    kind: token
      ? 'Token transfer event'
      : tx.input && tx.input !== '0x'
        ? 'Contract interaction (native value only)'
        : 'Native transfer',
  }
}
export function parseStacksTransaction(tx) {
  if (!/^(?:0x)?[\da-fA-F]{64}$/.test(tx.tx_id || '')) throw new Error('Invalid transaction hash')
  const transfer = tx.tx_type === 'token_transfer' ? tx.token_transfer : null
  return {
    hash: tx.tx_id,
    from: addressValue(tx.sender_address, 'stacks'),
    to: addressValue(transfer?.recipient_address || tx.contract_call?.contract_id, 'stacks'),
    amount: transfer ? formatUnits(transfer.amount, 6) : null,
    asset: 'STX',
    timestamp: timestamp(tx.burn_block_time || tx.receipt_time),
    status:
      tx.tx_status === 'success'
        ? tx.is_unanchored === true
          ? 'Unconfirmed'
          : 'Confirmed'
        : tx.tx_status === 'pending'
          ? 'Pending'
          : /^(abort_|dropped_)/.test(tx.tx_status || '')
            ? 'Failed'
            : 'Unknown',
    kind: transfer ? 'Native transfer' : 'Contract or other activity',
  }
}
export function parseBitcoinTransaction(tx, address) {
  if (!/^[\da-f]{64}$/i.test(tx.txid || '') || !Array.isArray(tx.vin) || !Array.isArray(tx.vout))
    throw new Error('Invalid Bitcoin transaction')
  const equal = (other) =>
    /^bc1/i.test(address)
      ? typeof other === 'string' && other.toLowerCase() === address.toLowerCase()
      : other === address
  const sent = tx.vin.some((input) => equal(input.prevout?.scriptpubkey_address))
  const outputs = tx.vout.filter((out) =>
    sent ? !equal(out.scriptpubkey_address) : equal(out.scriptpubkey_address),
  )
  const amount = outputs.every((out) => Number.isSafeInteger(out.value) && out.value >= 0)
    ? formatUnits(
        outputs.reduce((sum, out) => sum + BigInt(out.value), 0n),
        8,
      )
    : null
  return {
    hash: tx.txid,
    from: sent ? address : null,
    to: sent
      ? outputs.length === 1
        ? addressValue(outputs[0].scriptpubkey_address, 'bitcoin')
        : null
      : address,
    amount,
    asset: 'BTC',
    timestamp: timestamp(tx.status?.block_time),
    status:
      tx.status?.confirmed === true
        ? 'Confirmed'
        : tx.status?.confirmed === false
          ? 'Unconfirmed'
          : 'Unknown',
    kind: sent ? 'External outputs (may include other input owners)' : 'Outputs received',
    statusDetails:
      'Bitcoin can have multiple senders and recipients; output totals do not establish ownership.',
  }
}
export function parseSolanaTransaction(sig, tx) {
  if (typeof sig.signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(sig.signature))
    throw new Error('Invalid signature')
  const instructions = tx?.transaction?.message?.instructions || []
  const transfers = instructions.filter(
    (inst) =>
      ['system', 'spl-token', 'spl-token-2022'].includes(inst.program) &&
      ['transfer', 'transferChecked'].includes(inst.parsed?.type),
  )
  const inst = transfers.length === 1 ? transfers[0] : null
  const info = inst?.parsed?.info
  const native = inst?.program === 'system'
  const amount = !inst
    ? null
    : native
      ? Number.isSafeInteger(info.lamports)
        ? formatUnits(info.lamports, 9)
        : null
      : info.tokenAmount
        ? formatUnits(info.tokenAmount.amount, info.tokenAmount.decimals)
        : null
  return {
    hash: sig.signature,
    from: addressValue(info?.source, 'solana'),
    to: addressValue(info?.destination, 'solana'),
    amount,
    asset: inst && !native ? 'SPL token (unverified identity)' : 'SOL',
    timestamp: timestamp(sig.blockTime),
    status:
      sig.err || tx?.meta?.err
        ? 'Failed'
        : sig.confirmationStatus === 'finalized'
          ? 'Finalized'
          : sig.confirmationStatus === 'confirmed'
            ? 'Confirmed'
            : sig.confirmationStatus === 'processed'
              ? 'Pending'
              : 'Unknown',
    kind: !tx
      ? 'Signature only; details unavailable'
      : transfers.length > 1
        ? 'Multiple transfers; inspect explorer'
        : inst
          ? 'Parsed transfer'
          : 'Activity; transfer not decoded',
  }
}

async function collectTransactions(address, chain) {
  if (chain === 'ethereum' || chain === 'bnb') {
    const [native, tokens] = await Promise.allSettled([
      etherscan(address, chain, 'txlist'),
      etherscan(address, chain, 'tokentx'),
    ])
    if (native.status === 'rejected') throw native.reason
    const transactions = requireArray(native.value)
      .slice(0, 20)
      .map((tx) => parseEvmTransaction(tx, chain))
    if (tokens.status === 'fulfilled')
      transactions.push(
        ...requireArray(tokens.value)
          .slice(0, 20)
          .map((tx) => parseEvmTransaction(tx, chain, true)),
      )
    return {
      transactions: transactions
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 30),
      limitations: [
        'Recent normal transactions only; internal calls and approvals are not decoded.',
        ...(tokens.status === 'rejected'
          ? ['Token events unavailable.']
          : ['Token events use contract addresses; symbols are not trusted.']),
      ],
    }
  }
  if (chain === 'stacks') {
    const data = await fetchJSON(
      `${HIRO}/extended/v1/address/${encodeURIComponent(address)}/transactions?limit=20`,
    )
    return {
      transactions: requireArray(data.results).slice(0, 20).map(parseStacksTransaction),
      limitations: [
        'Recent anchored activity; contract calls are not represented as token transfers.',
      ],
    }
  }
  if (chain === 'bitcoin') {
    const data = await fetchJSON(
      `https://blockstream.info/api/address/${encodeURIComponent(address)}/txs`,
    )
    return {
      transactions: requireArray(data)
        .slice(0, 25)
        .map((tx) => parseBitcoinTransaction(tx, address)),
      limitations: [
        'Recent confirmed and mempool observations, not complete lifetime history. Bitcoin has multiple inputs and outputs.',
      ],
    }
  }
  if (chain === 'solana') {
    const signatures = requireArray(
      await solana('getSignaturesForAddress', [address, { limit: 6, commitment: 'confirmed' }]),
    ).slice(0, 6)
    const transactions = []
    for (let i = 0; i < signatures.length; i += 3) {
      transactions.push(
        ...(await Promise.all(
          signatures.slice(i, i + 3).map(async (sig) => {
            let tx = null
            try {
              tx = await solana('getTransaction', [
                sig.signature,
                {
                  encoding: 'jsonParsed',
                  commitment: 'confirmed',
                  maxSupportedTransactionVersion: 0,
                },
              ])
            } catch {
              /* signature remains usable */
            }
            return parseSolanaTransaction(sig, tx)
          }),
        )),
      )
    }
    return {
      transactions,
      limitations: [
        'Last six signatures; some details may be unavailable. Multiple/inner transfers and unchecked SPL amounts are not decoded.',
      ],
    }
  }
  throw new Error('Unsupported network')
}
export async function getRecentTransactions(address, chain) {
  if (!isValidAddress(address, chain)) throw new Error('Invalid address')
  return historyCache.run(walletKey(address, chain), () => collectTransactions(address, chain))
}
export async function getWalletData(address, chain) {
  if (!isValidAddress(address, chain)) throw new Error('Invalid address')
  let balance
  let totalTransactions = null
  let source
  if (chain === 'ethereum' || chain === 'bnb') {
    balance = formatUnits(await etherscan(address, chain, 'balance'), 18)
    source = 'Etherscan V2'
  } else if (chain === 'solana') {
    const data = await solana('getBalance', [address, { commitment: 'finalized' }])
    if (!Number.isSafeInteger(data?.value) || data.value < 0) throw new Error('Invalid balance')
    balance = formatUnits(data.value, 9)
    source = 'Solana mainnet RPC'
  } else if (chain === 'bitcoin') {
    const data = await fetchJSON(
      `https://blockstream.info/api/address/${encodeURIComponent(address)}`,
    )
    const stats = data.chain_stats
    if (
      ![stats?.funded_txo_sum, stats?.spent_txo_sum, stats?.tx_count].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      stats.funded_txo_sum < stats.spent_txo_sum
    )
      throw new Error('Invalid address statistics')
    balance = formatUnits(BigInt(stats.funded_txo_sum) - BigInt(stats.spent_txo_sum), 8)
    totalTransactions = String(stats.tx_count)
    source = 'Blockstream (confirmed balance)'
  } else if (chain === 'stacks') {
    const data = await fetchJSON(
      `${HIRO}/extended/v1/address/${encodeURIComponent(address)}/balances`,
    )
    balance = formatUnits(data.stx?.balance, 6)
    source = 'Hiro Stacks API'
  }
  if (balance === null || balance === undefined) throw new Error('Invalid balance')
  const asset = { ethereum: 'ETH', bnb: 'BNB', solana: 'SOL', bitcoin: 'BTC', stacks: 'STX' }[chain]
  return {
    balance: `${balance} ${asset}`,
    totalTransactions,
    walletAge: 'Not established',
    categories: [],
    chain,
    source,
    status: 'available',
  }
}
