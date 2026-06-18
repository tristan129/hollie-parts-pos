export default async function handler(req, res) {
  const SHEETS_URL = process.env.SHEETS_URL;

  if (!SHEETS_URL) {
    return res.status(500).json({ error: 'SHEETS_URL environment variable not set' });
  }

  if (req.method === 'GET') {
    try {
      const response = await fetch(SHEETS_URL);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error('GET error:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const response = await fetch(SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', ...body }),
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: 'Failed to process checkout' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
