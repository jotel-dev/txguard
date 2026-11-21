import { writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { getWalletData, getRecentTransactions } from '../src/blockchain.js'
import { goplusCheck } from '../src/riskEngine.js'
import { getRegistryInfo, getRegistryReceipt, CONTRACT } from '../server/registry.js'
import { fetchJSON } from '../server/http.js'
// Read-only public data checks. No wallet, signing, payments, environment mutation or deployment.
const targets = {
  ethereum: '0x0000000000000000000000000000000000000001',
  bnb: '0x0000000000000000000000000000000000000001',
  solana: '11111111111111111111111111111111',
  bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  stacks: 'SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM',
}
const checks = []
async function check(name, fn) {
  const start = performance.now()
  try {
    const value = await fn()
    checks.push({
      name,
      status: 'response',
      latencyMs: Math.round(performance.now() - start),
      value,
    })
  } catch {
    checks.push({ name, status: 'unavailable', latencyMs: Math.round(performance.now() - start) })
  }
}
const watchdog = setTimeout(async () => {
  await writeFile(
    '../docs/live-verification.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        note: 'Read-only probes; watchdog reached 35 seconds. Unfinished probes are not verified.',
        checks,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}, 35000)
await Promise.all([
  ...Object.entries(targets).map(([chain, address]) =>
    check(`${chain} balance`, () => getWalletData(address, chain)),
  ),
  ...['ethereum', 'bnb'].map((chain) =>
    check(`${chain} GoPlus`, () => goplusCheck(targets[chain], chain)),
  ),
  check('Stacks registry interface', getRegistryInfo),
  check('Deployed registry source matches local code', async () => {
    const [owner, name] = CONTRACT.split('.')
    const data = await fetchJSON(`https://api.hiro.so/v2/contracts/source/${owner}/${name}?proof=0`)
    const local = await readFile('../txguard-stacks/contracts/registry.clar', 'utf8')
    const normalize = (text) => text.replace(/;;[^\n]*/g, '').replace(/\s+/g, '')
    return {
      matchesIgnoringCommentsAndWhitespace: normalize(data.source) === normalize(local),
      sourceSha256: createHash('sha256').update(data.source).digest('hex'),
      publishHeight: data.publish_height,
    }
  }),
  check('Existing anchored registry receipt', async () => {
    const data = await fetchJSON(
      `https://api.hiro.so/extended/v1/address/${CONTRACT}/transactions?limit=50`,
    )
    const tx = data.results?.find(
      (tx) =>
        tx.tx_type === 'contract_call' &&
        tx.contract_call?.function_name === 'log-scan' &&
        tx.tx_status === 'success' &&
        tx.canonical === true &&
        tx.is_unanchored === false,
    )
    if (!tx)
      return {
        verified: false,
        note: 'No matching anchored successful call found in the recent sample.',
      }
    return getRegistryReceipt(tx.tx_id)
  }),
  check('Historically documented address security (OFAC 2022-04-14)', () =>
    goplusCheck('0x098b716b8aaf21512996dc57eb0615e2383e2f96', 'ethereum'),
  ),
  check('Bitcoin recent history', async () => {
    const data = await getRecentTransactions(targets.bitcoin, 'bitcoin')
    return { count: data.transactions.length, limitations: data.limitations }
  }),
  check('Stacks recent history', async () => {
    const data = await getRecentTransactions(targets.stacks, 'stacks')
    return { count: data.transactions.length, limitations: data.limitations }
  }),
  check('Solana recent signatures/history', async () => {
    const data = await getRecentTransactions(targets.solana, 'solana')
    return { count: data.transactions.length, limitations: data.limitations }
  }),
  check('Existing public app', async () => {
    const res = await fetch('https://txguard-gules.vercel.app', {
      signal: AbortSignal.timeout(7000),
    })
    return { status: res.status }
  }),
])
clearTimeout(watchdog)
await writeFile(
  '../docs/live-verification.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      note: 'Read-only public probes. Credentials absent means Etherscan balance is unavailable; unavailable probes are not successful integrations.',
      checks,
    },
    null,
    2,
  ),
)
console.log(
  checks.map((check) => `${check.name}: ${check.status} (${check.latencyMs}ms)`).join('\n'),
)
