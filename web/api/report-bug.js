import { guard } from '../server/http.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST', 5)) return
  return res
    .status(503)
    .json({
      error:
        'Persistent bug reporting is not configured. Please open an issue at https://github.com/jotel-dev/txguard/issues.',
    })
}
