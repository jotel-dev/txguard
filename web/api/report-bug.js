import { guard } from '../server/http.js'
export default async function handler(req, res) {
  if (!(await guard(req, res, 'POST', 'report-bug'))) return
  return res.status(503).json({
    error:
      'Persistent bug reporting is not configured. Please open an issue at https://github.com/jotel-dev/txguard/issues.',
  })
}
