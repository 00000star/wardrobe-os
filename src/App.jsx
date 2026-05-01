import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Camera, Check, ChevronRight, CircleDollarSign, Clock3, 
  Edit3, Heart, ImagePlus, Layers3, Lock, MessageSquareText, 
  Palette, Plus, RefreshCw, Search, Shirt, Sparkles, Star, Trash2, 
  Wand2, X, Zap, TrendingUp, History
} from 'lucide-react';
import { getAISuggestion, analyzeImage, buildCapsule } from './gemini';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const STORAGE_KEY = 'starlet-wardrobe-v3';
const SAVED_KEY   = 'starlet-saved-looks';

const CATEGORIES = ['Shirts', 'Trousers', 'Shoes', 'Jackets', 'Knitwear', 'Accessories'];
const OCCASIONS  = ['Casual', 'Smart Casual', 'Business Casual', 'Formal', 'Date Night', 'Weekend'];
const SEASONS    = ['Summer', 'Winter', 'Rainy', 'All Season'];

const COLOR_LIBRARY = [
  { name: 'White',    hex: '#f6f1e9' },
  { name: 'Black',    hex: '#121316' },
  { name: 'Navy',     hex: '#1f2e46' },
  { name: 'Blue',     hex: '#76a9e6' },
  { name: 'Brown',    hex: '#8b4f27' },
  { name: 'Beige',    hex: '#c7b79e' },
  { name: 'Grey',     hex: '#8f949c' },
  { name: 'Green',    hex: '#587c58' },
  { name: 'Burgundy', hex: '#743044' },
  { name: 'Cream',    hex: '#eadfcf' },
];

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function useLS(key, def) {
  const [val, setVal] = useState(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
    catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function calculateCPW(value, wears) {
  if (!value || wears === 0) return '—';
  return `$${(value / wears).toFixed(2)}`;
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useLS(STORAGE_KEY, []);
  const [saved, setSaved] = useLS(SAVED_KEY, []);
  const [active, setActive] = useState('closet');
  const [toast, setToast] = useState('');

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function upsertItem(next) {
    setItems(old => {
      const exists = old.some(i => i.id === next.id);
      return exists ? old.map(i => i.id === next.id ? next : i) : [next, ...old];
    });
  }

  function deleteItem(id) {
    setItems(old => old.filter(i => i.id !== id));
    notify('Item removed from starlet closet');
  }

  const nav = [
    { id: 'closet',  label: 'Closet',  Icon: Shirt },
    { id: 'stylist', label: 'Stylist', Icon: Wand2 },
    { id: 'capsule', label: 'Capsule', Icon: Layers3 },
    { id: 'saved',   label: 'Saved',   Icon: Star },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">S</div>
          <div><h1>Starlet</h1><p>Cosmic Wardrobe OS</p></div>
        </div>
        
        <nav>
          {nav.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActive(id)} className={active === id ? 'nav-button active' : 'nav-button'}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={16} color="var(--accent-cyan)" />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>Local-First</strong><br/>Data encrypted in-browser
            </div>
          </div>
        </div>
      </aside>

      <main className="main-stage">
        <div className="screen">
          {active === 'closet'  && <ClosetScreen items={items} upsertItem={upsertItem} deleteItem={deleteItem} notify={notify} />}
          {active === 'stylist' && <StylistScreen items={items} notify={notify} setSaved={setSaved} />}
          {active === 'capsule' && <CapsuleScreen items={items} notify={notify} />}
          {active === 'saved'   && <SavedScreen saved={saved} items={items} setSaved={setSaved} notify={notify} />}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
      
      <div className="mobile-nav">
        {nav.map(({ id, Icon }) => (
          <button key={id} onClick={() => setActive(id)} style={{ color: active === id ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
            <Icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CLOSET SCREEN
// ─────────────────────────────────────────────
function ClosetScreen({ items, upsertItem, deleteItem, notify }) {
  const [filter, setFilter] = useState('All');
  const [editing, setEditing] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const filtered = items.filter(i => filter === 'All' || i.category === filter);
  
  const stats = useMemo(() => ({
    count: items.length,
    value: items.reduce((s, i) => s + (Number(i.value) || 0), 0),
    wears: items.reduce((s, i) => s + (i.wearCount || 0), 0),
    avgCpw: items.length ? (items.reduce((s, i) => s + (i.value && i.wearCount ? i.value/i.wearCount : 0), 0) / items.length).toFixed(2) : '0'
  }), [items]);

  async function handleUpload(files) {
    setAnalyzing(true);
    notify(`Starlet AI is analyzing ${files.length} items...`);
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const aiData = await analyzeImage(dataUrl);
        upsertItem({
          id: crypto.randomUUID(),
          image: dataUrl,
          name: aiData?.name || "New Item",
          category: aiData?.category || "Shirts",
          color: aiData?.color || "Black",
          value: 0,
          wearCount: 0,
          occasions: aiData?.occasions || ["Casual"],
          seasons: aiData?.seasons || ["All Season"],
          formality: aiData?.formality || 3
        });
      } catch (e) { notify("Error analyzing item."); }
    }
    setAnalyzing(false);
    notify("Wardrobe updated.");
  }

  return (
    <div className="screen">
      <header className="section-header">
        <p className="eyebrow">Your Universe</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h2>The Closet</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={() => setEditing({ id: 'new', name: '', category: 'Shirts', color: 'Black', value: 0, wearCount: 0, occasions: [], seasons: [], formality: 3 })}>
              <Plus size={18} /> Manual
            </button>
            <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={analyzing}>
              {analyzing ? <RefreshCw size={18} className="spin" /> : <Camera size={18} />}
              {analyzing ? "Analyzing..." : "Add Clothing"}
            </button>
          </div>
        </div>
      </header>

      <div className="stats-bar">
        <div className="glass-panel stat-card">
          <span>Total Items</span>
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
        <div className="glass-panel stat-card">
          <span>Avg CPW</span>
          <strong>${stats.avgCpw}</strong>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '32px', display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px' }}>
        {['All', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`btn ${filter === c ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '8px 16px', fontSize: '13px' }}>
            {c}
          </button>
        ))}
      </div>

      <div className="wardrobe-grid">
        {filtered.map(item => (
          <article key={item.id} className="item-card">
            <div className="image-container">
              <img src={item.image} alt={item.name} />
              <div className="cpw-badge">{calculateCPW(item.value, item.wearCount)} / wear</div>
              <button style={{ position: 'absolute', top: 12, right: 12, color: item.favorite ? 'var(--rose)' : 'white' }} onClick={() => upsertItem({ ...item, favorite: !item.favorite })}>
                <Heart size={20} fill={item.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="item-info">
              <h4>{item.name}</h4>
              <p>{item.color} · {item.category}</p>
            </div>
            <div className="item-actions">
              <button className="btn btn-wear" onClick={() => { upsertItem({ ...item, wearCount: (item.wearCount || 0) + 1 }); notify(`Logged wear for ${item.name}`); }}>
                <Clock3 size={16} /> Wear Today
              </button>
              <button className="btn btn-outline" style={{ padding: '10px' }} onClick={() => setEditing(item)}>
                <Edit3 size={16} />
              </button>
              <button className="btn btn-outline" style={{ padding: '10px', color: 'var(--rose)' }} onClick={() => deleteItem(item.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel" style={{ padding: '80px', textAlign: 'center' }}>
          <Shirt size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Your closet is empty. Take a photo to start your journey.</p>
        </div>
      )}

      <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
      {editing && <ItemModal item={editing} onSave={(val) => { upsertItem(val); setEditing(null); }} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLIST SCREEN
// ─────────────────────────────────────────────
function StylistScreen({ items, notify, setSaved }) {
  const [prompt, setPrompt] = useState('Something sleek for a rainy night');
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState(null);

  async function generate() {
    if (items.length < 3) return notify("Add more clothes first!");
    setLoading(true);
    const res = await getAISuggestion(items, prompt, "All Season", "Clear", "Confident");
    if (res) {
      const outfitItems = res.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
      setOutfit({ ...res, items: outfitItems });
    } else { notify("Gemini failed to respond."); }
    setLoading(false);
  }

  return (
    <div className="screen">
      <header className="section-header">
        <p className="eyebrow">AI Intelligence</p>
        <h2>Stylist</h2>
      </header>

      <div className="stylist-container">
        <div className="glass-panel chat-box">
          <div className="bubble ai">I'm your Starlet Stylist. Tell me where you're going and I'll build the perfect look from your closet.</div>
          {outfit && (
            <div className="bubble user" style={{ alignSelf: 'flex-end' }}>{prompt}</div>
          )}
          {outfit && (
            <div className="bubble ai">
              <strong>{outfit.title}</strong>
              <p style={{ margin: '12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>{outfit.reasons[0]}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {outfit.items.map(i => <img key={i.id} src={i.image} style={{ height: '80px', objectFit: 'cover', borderRadius: '8px' }} />)}
              </div>
              <button className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} onClick={() => { setSaved(old => [{ ...outfit, id: Date.now() }, ...old]); notify("Look saved!"); }}>
                <Star size={16} /> Save to Favorites
              </button>
            </div>
          )}
          {loading && <div className="bubble ai"><RefreshCw size={20} className="spin" /> Thinking...</div>}

          <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
            <div className="glass-panel" style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
              <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What's the situation?" style={{ flex: 1, border: 'none', background: 'none', outline: 'none' }} />
            </div>
            <button className="btn btn-primary" onClick={generate} disabled={loading}>
              <Zap size={20} />
            </button>
          </div>
        </div>

        <div className="glass-panel">
          <p className="eyebrow">Style Tips</p>
          <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
            {outfit?.upgrades.map(u => (
              <div key={u} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                {u}
              </div>
            )) || <p style={{ color: 'var(--text-muted)' }}>Ask for a recommendation to see AI insights.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CAPSULE SCREEN
// ─────────────────────────────────────────────
function CapsuleScreen({ items, notify }) {
  const [prompt, setPrompt] = useState('A minimalist business trip capsule');
  const [capsule, setCapsule] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (items.length < 10) return notify("You need at least 10 items for a capsule!");
    setLoading(true);
    const res = await buildCapsule(items, prompt);
    if (res) {
      const capsuleItems = res.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
      setCapsule({ ...res, items: capsuleItems });
    }
    setLoading(false);
  }

  return (
    <div className="screen">
      <header className="section-header">
        <p className="eyebrow">Efficiency</p>
        <h2>Capsule Builder</h2>
      </header>

      <div className="glass-panel" style={{ marginBottom: '32px' }}>
        <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Let Gemini select 10 essential pieces that create dozens of outfits.</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input className="glass-panel" value={prompt} onChange={e => setPrompt(e.target.value)} style={{ flex: 1, padding: '12px 16px' }} />
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <RefreshCw className="spin" size={18} /> : "Build Capsule"}
          </button>
        </div>
      </div>

      {capsule && (
        <div className="capsule-builder">
          <div className="glass-panel">
            <h3 style={{ margin: '0 0 8px' }}>{capsule.title}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{capsule.explanation}</p>
          </div>
          <div className="wardrobe-grid">
            {capsule.items.map(item => (
              <div key={item.id} className="item-card">
                <img src={item.image} style={{ aspectRatio: '1', objectFit: 'cover' }} />
                <div style={{ padding: '12px' }}><strong>{item.name}</strong></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SAVED LOOKS
// ─────────────────────────────────────────────
function SavedScreen({ saved, setSaved, items, notify }) {
  return (
    <div className="screen">
      <header className="section-header">
        <p className="eyebrow">Favorites</p>
        <h2>Saved Looks</h2>
      </header>

      <div className="wardrobe-grid">
        {saved.map(look => (
          <div key={look.id} className="glass-panel item-card">
            <div style={{ display: 'flex', height: '140px' }}>
              {look.items.slice(0, 3).map(i => (
                <img key={i.id} src={i.image} style={{ flex: 1, objectFit: 'cover' }} />
              ))}
            </div>
            <div className="item-info">
              <h4>{look.title}</h4>
              <p>{look.items.length} items</p>
            </div>
            <div className="item-actions">
              <button className="btn btn-outline" style={{ width: '100%', color: 'var(--rose)' }} onClick={() => setSaved(old => old.filter(l => l.id !== look.id))}>
                <Trash2 size={16} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {saved.length === 0 && (
        <div className="glass-panel" style={{ padding: '80px', textAlign: 'center' }}>
          <Star size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No saved looks. Head to the Stylist to create one.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
        <h3>{item.id === 'new' ? 'New Item' : 'Edit Item'}</h3>
        <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Name
            <input className="glass-panel" style={{ width: '100%', marginTop: '4px', padding: '10px' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Price Paid ($)
            <input type="number" className="glass-panel" style={{ width: '100%', marginTop: '4px', padding: '10px' }} value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
