const GEMINI_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // Step 1: Fetch HTML
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!pageRes.ok) {
      throw new Error(`לא ניתן להביא את העמוד. סטטוס: ${pageRes.status}`);
    }

    const html = await pageRes.text();

    // Simple text extraction: remove HTML tags, scripts, styles
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    if (!content || content.length < 30) {
      throw new Error('לא ניתן לחלץ תוכן מהכתובת הזאת. נסה קישור אחר.');
    }

    // Step 2: Detect platform
    const platform = url.includes('youtube') || url.includes('youtu.be') ? 'youtube'
      : url.includes('instagram') ? 'instagram'
      : url.includes('facebook') || url.includes('fb.com') || url.includes('fb.watch') ? 'facebook'
      : 'אחר';

    // Step 3: Extract recipe with Gemini
    const prompt = `אתה מומחה בחילוץ מתכונים. חלץ את המתכון מהתוכן הבא והחזר JSON בלבד (ללא markdown blocks, ללא טקסט נוסף לפני או אחרי ה-JSON).

מבנה ה-JSON הנדרש בדיוק:
{
  "name": "שם המתכון בעברית",
  "category": "בחר בדיוק אחד מ: עוף, בשר, דגים, ירקות, פסטה, מרק, סלט, קינוח, לחם, אחר",
  "platform": "${platform}",
  "ingredients": [{"amount": "100", "unit": "גרם", "item": "שם המרכיב", "note": ""}],
  "steps": ["שלב 1", "שלב 2"],
  "time": "45 דקות",
  "difficulty": "קל",
  "cooking_method": "מחבת",
  "tags": ["תגית1", "תגית2"],
  "notes": ""
}

חוקים קשיחים:
- name חייב להיות בעברית
- difficulty: אחד מ: קל / בינוני / קשה
- cooking_method: אחד מ: תנור / מחבת / סיר / גריל / ללא בישול / מעשן / סו-ויד / אחר
- tags: עד 5 תגיות קצרות בעברית
- אם מידע חסר, השתמש ב-"" לשדות string וב-[] למערכים
- ingredients ו-steps חייבים להיות מערכי JSON (גם אם ריקים)
- החזר JSON בלבד — אין שום טקסט לפני { או אחרי }

תוכן לחילוץ (מתוך ${url}):
${content.substring(0, 6000)}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      throw new Error(`Gemini error ${geminiRes.status}: ${JSON.stringify(errData).slice(0, 300)}`);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON — be lenient about markdown fences
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('לא זוהה מתכון בתוכן זה. נסה קישור אחר.');

    const recipe = JSON.parse(jsonMatch[0]);
    recipe.video_url = url;

    // Ensure arrays
    if (!Array.isArray(recipe.ingredients)) recipe.ingredients = [];
    if (!Array.isArray(recipe.steps)) recipe.steps = [];
    if (!Array.isArray(recipe.tags)) recipe.tags = [];

    return res.json({ success: true, recipe });

  } catch (err) {
    console.error('Extract error:', err);
    return res.status(500).json({ error: err.message || 'שגיאה בחילוץ המתכון' });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
  },
};
