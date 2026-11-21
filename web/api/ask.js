import { guard } from '../server/http.js'
import { getReport, scanRecipient } from '../server/scan.js'
import { validateScan } from '../server/http.js'
import { explainReport } from '../server/ai.js'

export default async function handler(req, res) {
  if (!(await guard(req, res, 'POST', 'ask'))) return
  const { scanId, question } = req.body
  const input = validateScan(req.body)
  if (
    !input ||
    typeof scanId !== 'string' ||
    !/^[\da-f-]{36}$/i.test(scanId) ||
    typeof question !== 'string' ||
    !question.trim() ||
    question.length > 500
  )
    return res
      .status(400)
      .json({ error: 'A live scan and a question of up to 500 characters are required.' })
  try {
    // Serverless instances do not share memory: re-collect normalized evidence on a cold instance.
    let report = getReport(scanId)
    if (report && (report.wallet !== input.wallet || report.chain !== input.chain))
      return res.status(400).json({ error: 'Scan context does not match.' })
    if (!report) report = await scanRecipient(input.wallet, input.chain)
    const answer = await explainReport(report, question.trim())
    return res
      .status(200)
      .json({ answer: answer.text, source: answer.source, assessedAt: report.assessedAt })
  } catch {
    return res
      .status(503)
      .json({ error: 'Explanation unavailable. The evidence report remains available.' })
  }
}
