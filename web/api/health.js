import { guard } from '../server/http.js'
// Rate protection is checked, but health never fans out to paid/external providers.
export default async function handler(req, res) {
  if (!(await guard(req, res, 'GET', 'registry'))) return
  return res.status(200).json({
    status: 'ok',
    scope: 'api-and-request-protection',
    note: 'Does not establish upstream blockchain or AI availability.',
  })
}
