import { guard } from '../server/http.js'
import { getRegistryInfo, getRegistryReceipt } from '../server/registry.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'GET', 20)) return
  const txid = req.query?.txid
  if (txid !== undefined && (typeof txid !== 'string' || !/^(?:0x)?[\da-fA-F]{64}$/.test(txid)))
    return res.status(400).json({ error: 'Enter a valid Stacks transaction ID.' })
  try {
    return res.status(200).json(txid ? await getRegistryReceipt(txid) : await getRegistryInfo())
  } catch {
    return res
      .status(503)
      .json({ error: 'Stacks verification provider unavailable. No receipt has been verified.' })
  }
}
