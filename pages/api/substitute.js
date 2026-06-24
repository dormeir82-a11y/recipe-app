const GEMINI_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { missing, recipe } = req.body;
  if (!missing || !recipe) return res.status(400).json({ error: 'Missing params' });

  const ingList = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(i => typeof i === 'string' ? i : `${i.amount || ''} ${i.unit || ''} ${i.item || i.name || ''}`.trim()).join(', ')
    : '';

  const prompt = `אתה שף מנוסה. עזור למשתמש למצוא תחליפים חכמים.

מתכון: ${recipe.name}
קטגוריה: ${recipe.category || ''}
שיטת בישול: ${recipe.cooking_method || ''}
מרכיבים: ${ingList}

מה חסר / מה יש: ${missing}

הצע תחליפים ספציפיים שמתאימים למתכון. ענה בעברית בלבד. עד 200 מילה.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 512 } }) }
    );
    const data = await r.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'לא ניתן לקבל תשובה';
    return res.json({ answer });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
