import { readFile } from 'node:fs/promises'
import { verifyReceiptPackage } from '../shared/receipt.js'
// Offline integrity check only. No provider request, signing or transaction submission.
try {
  const bundle = JSON.parse(await readFile(process.argv[2], 'utf8'))
  if (!verifyReceiptPackage(bundle)) throw new Error('Commitment mismatch or invalid package')
  console.log(
    `Package integrity verified: ${bundle.commitment}. This does not prove onchain registration or assessment accuracy.`,
  )
} catch {
  console.error(
    'Receipt package could not be verified. Usage: node scripts/verify-receipt.mjs <private-package.json>',
  )
  process.exitCode = 1
}
