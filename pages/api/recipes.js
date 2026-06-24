const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const baseHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }
  if (req.method === 'GET') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/recipes?order=created_at.desc&select=*`, { headers: baseHeaders() });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    return res.json(data);
  } else if (req.method === 'POST') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/recipes`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify(req.body) });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    return res.json(Array.isArray(data) ? data[0] : data);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}`, { method: 'DELETE', headers: baseHeaders() });
    if (!r.ok) { const data = await r.json().catch(() => ({})); return res.status(500).json({ error: data }); }
    return res.json({ success: true });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
