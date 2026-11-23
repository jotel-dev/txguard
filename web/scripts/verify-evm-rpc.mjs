import { writeFile } from 'node:fs/promises'
import { bnbNativeBalance, evmTokenBalance } from '../server/evm-rpc.js'
const wallet = '0x0000000000000000000000000000000000000001'
const checks = []
// Public contract addresses are identifiers only; no legitimacy/ownership endorsement.
for (const [chain, token] of [
  ['ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
  ['bnb', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
]) {
  try {
    checks.push({ status: 'response', ...(await evmTokenBalance(wallet, chain, token)) })
  } catch {
    checks.push({ chain, token, status: 'unavailable' })
  }
}
try {
  checks.push({
    chain: 'bnb',
    balance: await bnbNativeBalance(wallet),
    kind: 'native',
    status: 'response',
  })
} catch {
  checks.push({ chain: 'bnb', kind: 'native', status: 'unavailable' })
}
await writeFile(
  '../docs/readiness-evm-rpc.json',
  JSON.stringify({ checkedAt: new Date().toISOString(), wallet, checks }, null, 2),
)
console.log(JSON.stringify(checks))
