export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, category, severity, email } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  // Print bug report in console for review/debugging
  console.log('=================== NEW BUG REPORT ===================');
  console.log(`Category: ${category || 'N/A'}`);
  console.log(`Severity: ${severity || 'N/A'}`);
  console.log(`Title:    ${title}`);
  console.log(`Email:    ${email || 'Anonymous'}`);
  console.log(`Details:  ${description}`);
  console.log('======================================================');

  // Simulate server side process delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return res.status(200).json({ success: true, message: 'Bug report received.' });
}
