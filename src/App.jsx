import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Shirt, Wand2, Layers3, Star, Camera, Plus, RefreshCw, 
  Clock3, Edit3, Trash2, Heart, Lock, Zap, Sparkles, X, ChevronRight
} from 'lucide-react';
import { getAISuggestion, analyzeImage, buildCapsule } from './gemini';

const STORAGE_KEY = 'starlet-ultra-v4';
const SAVED_KEY   = 'starlet-saved-v4';

function useLS(key, def) {
  const [val, setVal] = useState(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
    catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

export default function App() {
  const [items, setItems] = useLS(STORAGE_KEY, []);
  const [saved, setSaved] = useLS(SAVED_KEY, []);
  const [active, setActive] = useState('closet');
  const [toast, setToast] = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const upsertItem = (next) => {
    setItems(old => {
      const exists = old.some(i => i.id === next.id);
      return exists ? old.map(i => i.id === next.id ? next : i) : [next, ...old];
    });
  };

  const nav = [
    { id: 'closet',  label: 'Closet', Icon: Shirt },
    { id: 'stylist', label: 'Stylist', Icon: Wand2 },
    { id: 'capsule', label: 'Capsule', Icon: Layers3 },
    { id: 'saved',   label: 'Saved',   Icon: Star },
  ];

  return (
    <div className="app-shell">
      <div className="cosmic-bg" />
      
      <main className="main-stage">
        {active === 'closet'  && <ClosetScreen items={items} upsertItem={upsertItem} setItems={setItems} notify={notify} />}
        {active === 'stylist' && <StylistScreen items={items} notify={notify} setSaved={setSaved} />}
        {active === 'capsule' && <CapsuleScreen items={items} notify={notify} />}
        {active === 'saved'   && <SavedScreen saved={saved} setSaved={setSaved} notify={notify} />}
      </main>

      <nav className="nav-dock">
        {nav.map(({ id, Icon }) => (
          <button 
            key={id} 
            className={`nav-item ${active === id ? 'active' : ''}`}
            onClick={() => setActive(id)}
          >
            <div className="nav-indicator" />
            <Icon size={24} />
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ClosetScreen({ items, upsertItem, setItems, notify }) {
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const stats = useMemo(() => ({
    count: items.length,
    value: items.reduce((s, i) => s + (Number(i.value) || 0), 0),
    wears: items.reduce((s, i) => s + (i.wearCount || 0), 0),
  }), [items]);

  async function handleUpload(files) {
    setAnalyzing(true);
    notify(`Analyzing ${files.length} items...`);
    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise((res) => {
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(file);
        });
        const aiData = await analyzeImage(dataUrl);
        upsertItem({
          id: crypto.randomUUID(),
          image: dataUrl,
          name: aiData?.name || "New Starlet Item",
          category: aiData?.category || "Shirts",
          color: aiData?.color || "Black",
          value: 0,
          wearCount: 0,
          favorite: false
        });
      } catch (e) { notify("AI limit reached or error."); }
    }
    setAnalyzing(false);
    notify("Wardrobe updated.");
  }

  return (
    <div className="screen">
      <header className="section-header">
        <span className="brand-tag">Starlet OS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <h2>The Closet</h2>
          <button className="btn btn-primary btn-icon" onClick={() => fileRef.current.click()} disabled={analyzing}>
            {analyzing ? <RefreshCw size={20} className="spin" /> : <Camera size={20} />}
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="glass-panel stat-card">
          <span>Items</span>
          <strong>{stats.count}</strong>
        </div>
        <div className="glass-panel stat-card">
          <span>Net Value</span>
          <strong>${stats.value}</strong>
        </div>
        <div className="glass-panel stat-card">
          <span>Total Wears</span>
          <strong>{stats.wears}</strong>
        </div>
      </div>

      <div className="wardrobe-grid">
        {items.map(item => (
          <article key={item.id} className="item-card">
            <div className="image-container">
              <img src={item.image} alt="" />
              <div className="cpw-float">${item.wearCount > 0 ? (item.value / item.wearCount).toFixed(2) : item.value}</div>
            </div>
            <div className="item-info">
              <h4>{item.name}</h4>
              <button className="btn btn-primary" style={{ width: '100%', height: 36, marginTop: 10, fontSize: 12 }} onClick={() => { upsertItem({ ...item, wearCount: item.wearCount + 1 }); notify("Wear logged!"); }}>
                Wear Today
              </button>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', marginTop: 40 }}>
          <Shirt size={48} color="var(--text-dim)" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Your cosmic closet is empty.<br/>Upload your first photo to begin.</p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => fileRef.current.click()}>
            <Camera size={18} /> Take First Photo
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
      
      <div style={{ marginTop: 60, textAlign: 'center' }}>
        <button style={{ color: 'var(--accent-purple)', fontSize: 12, fontWeight: 700 }} onClick={() => { if(window.confirm("Wipe closet?")) { setItems([]); notify("Wiped."); } }}>
          RESET UNIVERSE
        </button>
      </div>
    </div>
  );
}

function StylistScreen({ items, notify, setSaved }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState(null);

  const generate = async () => {
    if (items.length < 2) return notify("Add items first!");
    setLoading(true);
    const res = await getAISuggestion(items, prompt || "Something sleek", "All Season", "Clear", "Confident");
    if (res) {
      const outfitItems = res.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
      setOutfit({ ...res, items: outfitItems });
    }
    setLoading(false);
  };

  return (
    <div className="screen">
      <header className="section-header">
        <span className="brand-tag">Intelligence</span>
        <h2>Stylist</h2>
      </header>

      <div className="ai-chat">
        <div className="bubble ai">I am the Starlet Stylist. Tell me the occasion and I will curate your wardrobe.</div>
        
        {outfit && (
          <div className="bubble ai animate-in">
            <strong>{outfit.title}</strong>
            <p style={{ fontSize: 13, margin: '8px 0', color: 'var(--text-dim)' }}>{outfit.reasons[0]}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              {outfit.items.map(i => <img key={i.id} src={i.image} style={{ height: 60, width: '100%', objectFit: 'cover', borderRadius: 8 }} />)}
            </div>
          </div>
        )}

        {loading && <div className="bubble ai"><RefreshCw size={20} className="spin" /> Computing...</div>}

        <div className="glass-panel" style={{ padding: 12, display: 'flex', gap: 10, marginTop: 20 }}>
          <input 
            value={prompt} 
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. Dinner on Mars"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '0 10px' }} 
          />
          <button className="btn btn-primary btn-icon" onClick={generate} disabled={loading}>
            <Zap size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CapsuleScreen({ items, notify }) {
  return (
    <div className="screen">
      <header className="section-header">
        <span className="brand-tag">Efficiency</span>
        <h2>Capsule</h2>
      </header>
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Capsule builder is calibrating.<br/>Add 10 items to unlock AI optimization.</p>
      </div>
    </div>
  );
}

function SavedScreen({ saved, setSaved, notify }) {
  return (
    <div className="screen">
      <header className="section-header">
        <span className="brand-tag">Favorites</span>
        <h2>Saved</h2>
      </header>
      {saved.length === 0 && (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center' }}>
          <Star size={32} color="var(--text-dim)" style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-dim)' }}>No saved looks in this sector.</p>
        </div>
      )}
    </div>
  );
}
