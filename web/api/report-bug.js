import fs from 'fs';
import path from 'path';

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

  const bugReport = {
    id: Date.now(),
    category: category || 'N/A',
    severity: severity || 'N/A',
    title,
    email: email || 'Anonymous',
    description,
    timestamp: new Date().toISOString()
  };

  // Write report to local bugs.json database file for persistence
  try {
    const filePath = path.join(process.cwd(), 'api', 'bugs.json');
    let bugs = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      bugs = JSON.parse(data || '[]');
    }
    bugs.push(bugReport);
    fs.writeFileSync(filePath, JSON.stringify(bugs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save bug report persistently:', err);
  }

  // Print bug report in console for review/debugging
  console.log('=================== NEW BUG REPORT ===================');
  console.log(`ID:       ${bugReport.id}`);
  console.log(`Category: ${bugReport.category}`);
  console.log(`Severity: ${bugReport.severity}`);
  console.log(`Title:    ${bugReport.title}`);
  console.log(`Email:    ${bugReport.email}`);
  console.log(`Details:  ${bugReport.description}`);
  console.log('======================================================');

  // Simulate server side process delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return res.status(200).json({ success: true, message: 'Bug report persistently stored.' });
}

