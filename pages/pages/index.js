import { useState, useEffect } from 'react';
import Head from 'next/head';

const CATS = {
  'עוף': { color: '#D4751A', e: '🍗' },
  'בשר': { color: '#B03030', e: '🥩' },
};

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.json())
      .then(d => { setRecipes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setRecipes([]); setLoading(false); });
  }, []);

  return (
    <div dir="rtl" style={{ fontFamily: 'sans-serif', padding: 20, minHeight: '100vh' }}>
      <Head>
        <title>המתכונים שלי</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      
      <h1>🍽️ המתכונים שלי</h1>
      
      {loading ? (
        <p>טוען...</p>
      ) : recipes.length === 0 ? (
        <p>אין עדיין מתכונים</p>
      ) : (
        <div>
          {recipes.map(r => (
            <div key={r.id} style={{ padding: 10, margin: 10, border: '1px solid #ccc', borderRadius: 8 }}>
              <h3>{r.name}</h3>
              <p>{r.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
