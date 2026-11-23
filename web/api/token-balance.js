import { guard } from '../server/http.js'
import { evmTokenBalance } from '../server/evm-rpc.js'
import { isValidAddress } from '../shared/chains.js'
export default async function handler(req, res) {
  if (!(await guard(req, res, 'GET', 'history'))) return
  const { wallet, chain, token } = req.query || {}
  if (
    !['ethereum', 'bnb'].includes(chain) ||
    !isValidAddress(wallet, chain) ||
    !isValidAddress(token, chain)
  )
    return res
      .status(400)
      .json({ error: 'Enter valid wallet and token contract addresses on Ethereum or BNB Chain.' })
  try {
    return res.status(200).json(await evmTokenBalance(wallet, chain, token))
  } catch {
    return res.status(503).json({
      error:
        'Token balance unavailable. This contract or provider may not support the required calls.',
    })
  }
}
