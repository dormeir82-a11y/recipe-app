import { useState, useEffect } from 'react';
import Head from 'next/head';

// ─── Category config ────────────────────────────────────────────────────────
const CATS = {
  'עוף':   { color: '#D4751A', e: '🍗' },
  'בשר':   { color: '#B03030', e: '🥩' },
  'דגים':  { color: '#2471A3', e: '🐟' },
  'ירקות': { color: '#1A7A40', e: '🥦' },
  'פסטה':  { color: '#CC8800', e: '🍝' },
  'מרק':   { color: '#7030A0', e: '🍲' },
  'סלט':   { color: '#0D7060', e: '🥗' },
  'קינוח': { color: '#C0305C', e: '🍰' },
  'לחם':   { color: '#6B3520', e: '🍞' },
  'אחר':   { color: '#556677', e: '🍽️' },
};

// ─── Canvas helpers ──────────────────────────────────────────────────────────
function hexRgb(hex) {
  return hex.slice(1).match(/../g).map(x => parseInt(x, 16));
}

function drawCanvas(recipe, W, H, emojiPx) {
  if (typeof document === 'undefined') return '';
  const c = CATS[recipe.category] || CATS['אחר'];
  const [r, g, b] = hexRgb(c.color);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const cx = W / 2, cy = H / 2;

  const gd = ctx.createLinearGradient(0, 0, W, H);
  gd.addColorStop(0, `rgba(${r},${g},${b},.85)`);
  gd.addColorStop(1, `rgba(${Math.max(0,r-55)},${Math.max(0,g-55)},${Math.max(0,b-55)},.97)`);
  ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);

  const lg = ctx.createRadialGradient(cx*.7, cy*.5, 0, cx, cy, W*.55);
  lg.addColorStop(0, 'rgba(255,255,255,.22)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

  for (const [rad, a] of [[emojiPx*.85, .13],[emojiPx*.75, .2]]) {
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
  }

  ctx.font = `${emojiPx}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(c.e, cx, cy);

  const vg = ctx.createLinearGradient(0, H*.5, 0, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  return cv.toDataURL('image/jpeg', .85);
}

// ─── RecipeCard ──────────────────────────────────────────────────────────────
function RecipeCard({ r, onClick }) {
  const [img, setImg] = useState('');
  useEffect(() => { setImg(drawCanvas(r, 520, 168, 72)); }, [r]);
  const c = CATS[r.category] || CATS['אחר'];
  const tags = Array.isArray(r.tags) ? r.tags : [];

  return (
    <div onClick={onClick} className="r-card">
      <div style={{
        height: 128, position: 'relative', overflow: 'hidden',
        backgroundImage: img ? `url(${img})` : undefined,
        backgroundColor: c.color, backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!img && <span style={{ fontSize: 48 }}>{c.e}</span>}
        <span className="badge-cat">{r.category}</span>
        {r.platform && r.platform !== 'אחר' && (
          <span className="badge-platform">{r.platform.toUpperCase()}</span>
        )}
      </div>
      <div style={{ padding: '11px 14px 13px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, marginBottom: 6 }}>{r.name}</div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
            {tags.slice(0, 3).map(t => <span key={t} className="r-tag">{t}</span>)}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#9B9A94', display: 'flex', gap: 4 }}>
          {r.time && <span>{r.time}</span>}
          {r.time && r.difficulty && <span style={{ color: '#D0CEC6' }}>•</span>}
          {r.difficulty && <span>{r.difficulty}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────
function Detail({ recipe, onDelete }) {
  const [heroImg, setHeroImg] = useState('');
  const [subInput, setSubInput] = useState('');
  const [subResult, setSubResult] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    setHeroImg(drawCanvas(recipe, 800, 240, 120));
    setSubInput(''); setSubResult('');
  }, [recipe]);

  const handleSub = async () => {
    if (!subInput.trim()) return;
    setSubLoading(true); setSubResult('');
    try {
      const res = await fetch('/api/substitute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missing: subInput, recipe }),
      });
      const data = await res.json();
      setSubResult(res.ok ? data.answer : '⚠️ ' + data.error);
    } catch { setSubResult('שגיאה בחיבור לשרת'); }
    setSubLoading(false);
  };

  const c = CATS[recipe.category] || CATS['אחר'];
  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

  const fmtIng = ing => typeof ing === 'string' ? ing
    : `${ing.amount || ''} ${ing.unit || ''} ${ing.item || ing.name || ''}${ing.note ? ` (${ing.note})` : ''}`.trim();

  const fmtStep = s => typeof s === 'string' ? s : s.description || s.text || JSON.stringify(s);

  return (
    <div>
      {/* Hero */}
      <div style={{
        borderRadius: 18, overflow: 'hidden', marginBottom: 16, height: 220,
        backgroundImage: heroImg ? `url(${heroImg})` : undefined,
        backgroundColor: c.color, backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-end', padding: '0 24px 20px', position: 'relative',
      }}>
        {!heroImg && <span style={{ fontSize: 80, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)' }}>{c.e}</span>}
        <div style={{ fontSize: 19, fontWeight: 700, color: 'rgba(255,255,255,.96)', textShadow: '0 2px 10px rgba(0,0,0,.55)', textAlign: 'center', lineHeight: 1.3, position: 'relative', zIndex: 1 }}>
          {recipe.name}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: recipe card */}
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '18px 22px 22px' }}>
            {/* Meta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {recipe.time && <span className="meta-chip">⏱ {recipe.time}</span>}
              {recipe.difficulty && <span className="meta-chip">{recipe.difficulty}</span>}
              {recipe.cooking_method && <span className="meta-chip">{recipe.cooking_method}</span>}
              {tags.map(t => <span key={t} className="meta-chip tag-chip">{t}</span>)}
            </div>

            {recipe.video_url && (
              <a href={recipe.video_url} target="_blank" rel="noopener noreferrer" className="video-link">
                ▶ לסרטון המקור
              </a>
            )}

            {/* Ingredients */}
            <div className="section-title" style={{ borderBottomColor: c.color }}>מרכיבים</div>
            {ings.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {ings.map((ing, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.85, color: '#2A2A2A', padding: '3px 0', borderBottom: '1px solid #F2F0EB', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
                    {fmtIng(ing)}
                  </li>
                ))}
              </ul>
            ) : <div style={{ fontSize: 13, color: '#9B9A94' }}>אין מרכיבים מפורטים</div>}

            {/* Steps */}
            <div className="section-title" style={{ marginTop: 16, borderBottomColor: c.color }}>אופן ההכנה</div>
            {steps.length > 0 ? (
              <ol style={{ listStyle: 'none', padding: 0 }}>
                {steps.map((step, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.8, color: '#2A2A2A', padding: '8px 0', borderBottom: '1px solid #F2F0EB', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ minWidth: 22, width: 22, height: 22, borderRadius: '50%', background: c.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 3 }}>{i + 1}</span>
                    {fmtStep(step)}
                  </li>
                ))}
              </ol>
            ) : (
              <div style={{ fontSize: 13, padding: '12px 14px', borderRadius: 10, background: '#FFF6E8', border: '1px solid #FAC775', color: '#633806', lineHeight: 1.7 }}>
                אין שלבי הכנה מפורטים
              </div>
            )}

            {recipe.notes && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#9B9A94', lineHeight: 1.6, padding: '10px 12px', background: '#F9F8F4', borderRadius: 8 }}>
                {recipe.notes}
              </div>
            )}

            <button onClick={onDelete} style={{ marginTop: 20, padding: '8px 16px', background: '#fff', color: '#C0392B', border: '1.5px solid #F1948A', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑 מחק מתכון
            </button>
          </div>
        </div>

        {/* Right: substitute assistant */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderTop: `3px solid ${c.color}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🧑‍🍳 עוזר תחליפים</div>
          <div style={{ fontSize: 12, color: '#6B6A65', marginBottom: 12, lineHeight: 1.6 }}>
            מה אין לך בבית? כתוב כאן ואציע תחליף שמתאים בדיוק למתכון הזה.
          </div>
          <textarea
            value={subInput} onChange={e => setSubInput(e.target.value)}
            placeholder="לדוגמה: אין לי כמון, יש לי רק גבינת עיזים..."
            style={{ width: '100%', minHeight: 68, borderRadius: 10, border: '1.5px solid #E0DED6', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', direction: 'rtl', background: '#F9F8F4', fontFamily: 'inherit', color: '#1A1A1A' }}
          />
          <button onClick={handleSub} disabled={subLoading || !subInput.trim()}
            style={{ marginTop: 10, width: '100%', padding: 11, border: 'none', borderRadius: 10, background: c.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: subLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
            {subLoading ? 'חושב כמו שף...' : '🔎 מצא תחליף'}
          </button>
          {subResult && (
            <div style={{ marginTop: 12, padding: '13px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', background: '#F9F8F4', border: '1px solid #E5E3DC', color: '#2A2A2A' }}>
              {subResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid' | 'add' | 'detail'
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('הכל');
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch { setRecipes([]); }
    setLoading(false);
  };

  useEffect(() => { loadRecipes(); }, []);

  const usedCats = ['הכל', ...Object.keys(CATS).filter(k => recipes.some(r => r.category === k))];

  const filtered = recipes.filter(r => {
    if (catFilter !== 'הכל' && r.category !== catFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const ingStr = JSON.stringify(r.ingredients || '').toLowerCase();
      if (!r.name?.toLowerCase().includes(s) &&
          !(r.tags || []).some(t => t.toLowerCase().includes(s)) &&
          !ingStr.includes(s)) return false;
    }
    return true;
  });

  const goGrid = () => { setView('grid'); setSelected(null); setPending(null); setError(''); };

  const handleExtract = async () => {
    if (!urlInput.trim()) return;
    setExtracting(true); setError('');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPending(data.recipe);
    } catch (e) { setError(e.message || 'שגיאה לא ידועה'); }
    setExtracting(false);
  };

  const handleSave = async () => {
    if (!pending) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'שגיאה בשמירה'); }
      await loadRecipes();
      goGrid();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await fetch(`/api/recipes?id=${selected.id}`, { method: 'DELETE' });
    setDeleteConfirm(false);
    await loadRecipes();
    goGrid();
  };

  return (
    <div dir="rtl" style={{ fontFamily: '-apple-system,"Segoe UI",Arial,sans-serif', background: '#F2F0EB', minHeight: '100vh', color: '#1A1A1A' }}>
      <Head>
        <title>המתכונים שלי</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #F2F0EB; }
          input, textarea, button, select { font-family: inherit; }
          .r-card { background: #fff; border-radius: 16px; overflow: hidden; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.07); transition: transform .15s, box-shadow .15s; }
          .r-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
          .r-tag { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: #F2F0EB; color: #6B6A65; border: 1px solid #E5E3DC; }
          .badge-cat { position: absolute; bottom: 8px; right: 10px; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 20px; background: rgba(255,255,255,.22); color: rgba(255,255,255,.95); border: 1px solid rgba(255,255,255,.3); }
          .badge-platform { position: absolute; top: 8px; left: 8px; font-size: 10px; font-weight: 700; padding: 3px 7px; border-radius: 20px; background: rgba(0,0,0,.3); color: rgba(255,255,255,.92); letter-spacing: .04em; }
          .chip { flex-shrink: 0; padding: 5px 12px; border-radius: 20px; border: 1.5px solid #E0DED6; background: #fff; font-size: 12px; font-weight: 500; cursor: pointer; color: #4A4A45; transition: all .12s; white-space: nowrap; }
          .chip:hover { border-color: #B0AFA8; }
          .chip.active { color: #fff; border-color: transparent; }
          .meta-chip { font-size: 12px; padding: 4px 11px; border-radius: 20px; background: #F2F0EB; color: #4A4A45; border: 1px solid #E5E3DC; }
          .tag-chip { background: #EAFAF1; color: #1A5632; border-color: #82E0AA; }
          .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; padding-bottom: 7px; border-bottom: 2.5px solid; }
          .video-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #185FA5; border: 1px solid #B5D4F4; border-radius: 20px; padding: 6px 14px; text-decoration: none; margin-bottom: 16px; transition: background .12s; }
          .video-link:hover { background: #E6F1FB; }
          .detail-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
          @media (max-width: 700px) {
            .detail-grid { grid-template-columns: 1fr; }
          }
          ::-webkit-scrollbar { width: 6px; height: 4px; }
          ::-webkit-scrollbar-thumb { background: #D0CEC6; border-radius: 4px; }
        `}</style>
      </Head>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E5E3DC', padding: '12px 20px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700 }}>
            🍽️ המתכונים שלי
            <span style={{ fontSize: 11, fontWeight: 500, background: '#F2F0EB', color: '#6B6A65', borderRadius: 20, padding: '2px 10px', border: '1px solid #E0DED6' }}>
              {recipes.length} מתכונים
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {view === 'grid' && (
              <div style={{ position: 'relative' }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="חיפוש..." dir="rtl"
                  style={{ width: 160, padding: '6px 30px 6px 10px', border: '1px solid #E0DED6', borderRadius: 24, fontSize: 13, background: '#F9F8F4', outline: 'none', direction: 'rtl', color: '#1A1A1A' }} />
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
              </div>
            )}
            {view === 'grid' ? (
              <button onClick={() => { setView('add'); setPending(null); setUrlInput(''); setError(''); }}
                style={{ padding: '8px 18px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + הוסף מתכון
              </button>
            ) : (
              <button onClick={goGrid}
                style={{ padding: '7px 16px', background: '#fff', color: '#4A4A45', border: '1.5px solid #E0DED6', borderRadius: 24, fontSize: 13, cursor: 'pointer' }}>
                ← חזרה לרשימה
              </button>
            )}
          </div>
        </div>

        {view === 'grid' && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {usedCats.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`chip${catFilter === cat ? ' active' : ''}`}
                style={catFilter === cat ? { background: cat === 'הכל' ? '#1A1A1A' : (CATS[cat]?.color || '#1A1A1A') } : {}}>
                {cat !== 'הכל' && CATS[cat] ? CATS[cat].e + ' ' : ''}{cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={{ padding: 20, maxWidth: 1120, margin: '0 auto' }}>

        {/* Grid */}
        {view === 'grid' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 60, fontSize: 14, color: '#9B9A94' }}>⏳ טוען מתכונים...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{recipes.length === 0 ? '🍽️' : '🔍'}</div>
              <div style={{ fontSize: 14, color: '#9B9A94' }}>{recipes.length === 0 ? 'אין עדיין מתכונים — לחץ "+ הוסף מתכון" כדי להתחיל!' : 'אין תוצאות לחיפוש הזה'}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
              {filtered.map(r => (
                <RecipeCard key={r.id} r={r} onClick={() => { setSelected(r); setView('detail'); }} />
              ))}
            </div>
          )
        )}

        {/* Add recipe */}
        {view === 'add' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>הוסף מתכון חדש</h2>

            {!pending ? (
              <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📎 הדבק קישור לסרטון או אתר</div>
                <div style={{ fontSize: 12, color: '#6B6A65', marginBottom: 16, lineHeight: 1.6 }}>YouTube, Instagram, Facebook, TikTok, או כל אתר מתכונים</div>
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  dir="ltr"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E0DED6', borderRadius: 12, fontSize: 13, marginBottom: 14, outline: 'none', direction: 'ltr', color: '#1A1A1A' }}
                  onKeyDown={e => e.key === 'Enter' && handleExtract()} />
                {error && (
                  <div style={{ color: '#C0392B', fontSize: 13, marginBottom: 12, padding: 12, background: '#FFF0EE', borderRadius: 8, lineHeight: 1.5 }}>⚠️ {error}</div>
                )}
                <button onClick={handleExtract} disabled={extracting || !urlInput.trim()}
                  style={{ width: '100%', padding: 13, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: extracting || !urlInput.trim() ? 0.65 : 1 }}>
                  {extracting ? '⏳ מחלץ מתכון... (עד 40 שניות)' : '🔎 חלץ מתכון אוטומטית'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: '#EAFAF1', border: '1px solid #82E0AA', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#1A5632', lineHeight: 1.5 }}>
                  ✅ המתכון חולץ בהצלחה! ניתן לערוך לפני השמירה.
                </div>
                <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#9B9A94', display: 'block', marginBottom: 4 }}>שם המתכון</label>
                      <input value={pending.name || ''} onChange={e => setPending({ ...pending, name: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E0DED6', borderRadius: 8, fontSize: 13, outline: 'none', color: '#1A1A1A' }} dir="rtl" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#9B9A94', display: 'block', marginBottom: 4 }}>קטגוריה</label>
                        <select value={pending.category || 'אחר'} onChange={e => setPending({ ...pending, category: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E0DED6', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#1A1A1A' }}>
                          {Object.keys(CATS).map(k => <option key={k}>{k}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#9B9A94', display: 'block', marginBottom: 4 }}>זמן</label>
                        <input value={pending.time || ''} onChange={e => setPending({ ...pending, time: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E0DED6', borderRadius: 8, fontSize: 13, outline: 'none', color: '#1A1A1A' }} dir="rtl" />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6B6A65', padding: '10px 12px', background: '#F9F8F4', borderRadius: 8, lineHeight: 1.6 }}>
                      {Array.isArray(pending.ingredients) && pending.ingredients.length > 0 && <span><strong style={{ color: '#1A1A1A' }}>{pending.ingredients.length} מרכיבים</strong> · </span>}
                      {Array.isArray(pending.steps) && pending.steps.length > 0 && <span><strong style={{ color: '#1A1A1A' }}>{pending.steps.length} שלבי הכנה</strong></span>}
                      {pending.difficulty && <span> · {pending.difficulty}</span>}
                      {pending.cooking_method && <span> · {pending.cooking_method}</span>}
                    </div>
                  </div>

                  {error && (
                    <div style={{ color: '#C0392B', fontSize: 13, margin: '12px 0', padding: 12, background: '#FFF0EE', borderRadius: 8 }}>⚠️ {error}</div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={handleSave} disabled={saving}
                      style={{ flex: 1, padding: 12, background: '#1A7A40', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'שומר...' : '💾 שמור מתכון'}
                    </button>
                    <button onClick={() => { setPending(null); setUrlInput(''); setError(''); }}
                      style={{ padding: '12px 18px', background: '#fff', color: '#4A4A45', border: '1.5px solid #E0DED6', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail */}
        {view === 'detail' && selected && (
          <Detail recipe={selected} onDelete={() => setDeleteConfirm(true)} />
        )}
      </main>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 340, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>למחוק את המתכון?</div>
            <div style={{ fontSize: 13, color: '#6B6A65', marginBottom: 20 }}>פעולה זו אינה ניתנת לביטול</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete}
                style={{ flex: 1, padding: 12, background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>מחק</button>
              <button onClick={() => setDeleteConfirm(false)}
                style={{ flex: 1, padding: 12, background: '#fff', border: '1.5px solid #E0DED6', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
