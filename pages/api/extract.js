const APIFY_KEY = process.env.APIFY_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${APIFY_KEY}&timeout=50`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: url, maxResults: 1 }) }
    );
    if (!apifyRes.ok) { const t = await apifyRes.text(); throw new Error(`Apify error ${apifyRes.status}: ${t.slice(0,200)}`); }

    const apifyData = await apifyRes.json();
    const item = Array.isArray(apifyData) ? apifyData[0] : apifyData;
    const content = item?.markdown || item?.text || item?.content || '';
    if (!content || content.length < 30) throw new Error('לא ניתן לחלץ תוכן מהכתובת הזאת. נסה קישור אחר.');

    const platform = url.includes('youtube') || url.includes('youtu.be') ? 'youtube'
      : url.includes('instagram') ? 'instagram'
      : url.includes('facebook') || url.includes('fb.com') ? 'facebook'
      : 'אחר';

    const prompt = `אתה מומחה בחילוץ מתכונים. חלץ את המתכון מהתוכן הבא והחזר JSON בלבד.

מבנה JSON:
{
  "name": "שם המתכון בעברית",
  "category": "עוף/בשר/דגים/ירקות/פסטה/מרק/סלט/קינוח/לחם/אחר",
  "platform": "${platform}",
  "ingredients": [{"amount": "100", "unit": "גרם", "item": "מרכיב", "note": ""}],
  "steps": ["שלב 1", "שלב 2"],
  "time": "45 דקות",
  "difficulty": "קל",
  "cooking_method": "מחבת",
  "tags": ["תגית1"],
  "notes": ""
}

החזר JSON בלבד — בלי טקסט לפני { או אחרי }.

תוכן (מתוך ${url}):
${content.substring(0, 6000)}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }) }
    );
    if (!geminiRes.ok) { const e = await geminiRes.json().catch(()=>({})); throw new Error(`Gemini error ${geminiRes.status}: ${JSON.stringify(e).slice(0,200)}`); }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('לא זוהה מתכון. נסה קישור אחר.');
    const recipe = JSON.parse(jsonMatch[0]);
    recipe.video_url = url;
    if (!Array.isArray(recipe.ingredients)) recipe.ingredients = [];
    if (!Array.isArray(recipe.steps)) recipe.steps = [];
    if (!Array.isArray(recipe.tags)) recipe.tags = [];
    return res.json({ success: true, recipe });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'שגיאה בחילוץ' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' }, responseLimit: false } };
