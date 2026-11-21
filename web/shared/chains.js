import { base58, base58check, bech32, bech32m } from '@scure/base'
import { sha256 } from '@noble/hashes/sha256'
import { keccak_256 } from '@noble/hashes/sha3'
import { c32addressDecode } from 'c32check'

export const CHAINS = [
  { id: 'ethereum', label: 'Ethereum', asset: 'ETH', chainId: 1, explorer: 'https://etherscan.io' },
  { id: 'bnb', label: 'BNB Chain', asset: 'BNB', chainId: 56, explorer: 'https://bscscan.com' },
  { id: 'solana', label: 'Solana', asset: 'SOL', explorer: 'https://explorer.solana.com' },
  { id: 'bitcoin', label: 'Bitcoin', asset: 'BTC', explorer: 'https://blockstream.info' },
  { id: 'stacks', label: 'Stacks', asset: 'STX', explorer: 'https://explorer.hiro.so' },
]

export function isValidAddress(address, chain) {
  if (typeof address !== 'string' || address.length > 128 || address !== address.trim()) return false
  try {
    if (chain === 'ethereum' || chain === 'bnb') {
      if (!/^0x[\da-fA-F]{40}$/.test(address)) return false
      const hex = address.slice(2)
      if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true
      const hash = Array.from(keccak_256(new TextEncoder().encode(hex.toLowerCase())), b => b.toString(16).padStart(2, '0')).join('')
      return [...hex].every((c, i) => /\d/.test(c) || c === (parseInt(hash[i], 16) >= 8 ? c.toUpperCase() : c.toLowerCase()))
    }
    if (chain === 'solana') return address.length >= 32 && address.length <= 44 && base58.decode(address).length === 32
    if (chain === 'bitcoin') {
      if (/^[13]/.test(address)) {
        const data = base58check(sha256).decode(address)
        return data.length === 21 && (data[0] === 0 || data[0] === 5)
      }
      if (!/^bc1/i.test(address) || address.length > 90) return false
      let decoded
      try { decoded = bech32.decode(address) } catch { decoded = bech32m.decode(address) }
      if (decoded.prefix !== 'bc') return false
      const version = decoded.words[0]
      const program = bech32.fromWords(decoded.words.slice(1))
      if (version > 16 || program.length < 2 || program.length > 40) return false
      if (version === 0) {
        bech32.decode(address)
        return program.length === 20 || program.length === 32
      }
      bech32m.decode(address)
      return true
    }
    if (chain === 'stacks') {
      const [principal, name, extra] = address.split('.')
      if (extra !== undefined || (name !== undefined && !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(name))) return false
      if (principal !== principal.toUpperCase()) return false
      const [version] = c32addressDecode(principal)
      return version === 22 || version === 20 // mainnet single/multisig only
    }
  } catch { return false }
  return false
}

export function walletKey(wallet, chain) {
  return `${chain}:${chain === 'ethereum' || chain === 'bnb' || (chain === 'bitcoin' && /^bc1/i.test(wallet)) ? wallet.toLowerCase() : wallet}`
}

export function explorerLink(chain, value, type = 'address') {
  const network = CHAINS.find(c => c.id === chain)
  if (!network || typeof value !== 'string' || value.length > 128 || !/^[\w.-]+$/.test(value)) return null
  const path = chain === 'stacks' ? (type === 'tx' ? 'txid' : 'address') : type
  return `${network.explorer}/${path}/${encodeURIComponent(value)}${chain === 'stacks' ? '?chain=mainnet' : ''}`
}

export function formatUnits(value, decimals) {
  if (String(value).length > 256 || !/^\d+$/.test(String(value)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null
  const digits = BigInt(value).toString().padStart(decimals + 1, '0')
  if (decimals === 0) return digits
  const fraction = digits.slice(-decimals).replace(/0+$/, '')
  return `${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`
}

export function formatTimestamp(value) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Time unavailable'
}
