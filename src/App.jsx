import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, BarChart3, CalendarDays, Camera, Check, ChevronRight,
  CircleDollarSign, ClipboardCheck, Clock3, Edit3, Filter, Gauge,
  Heart, ImagePlus, Layers3, Lock, MessageSquareText, PackageCheck,
  Palette, Plus, RefreshCw, Search, Shirt, Sparkles, Star, Trash2,
  Wand2, X, Zap, BookOpen, Luggage, History, MoreHorizontal, TrendingUp
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const STORAGE_KEY   = 'wardrobe-os-v2';
const HISTORY_KEY   = 'wardrobe-os-history';
const CALENDAR_KEY  = 'wardrobe-os-calendar';
const MOOD_KEY      = 'wardrobe-os-mood';
const PACKING_KEY   = 'wardrobe-os-packing';

const CATEGORIES = ['Shirts', 'Trousers', 'Shoes', 'Jackets', 'Knitwear', 'Accessories'];
const OCCASIONS  = ['Casual', 'Smart Casual', 'Business Casual', 'Formal', 'Date Night', 'Weekend'];
const SEASONS    = ['Summer', 'Winter', 'Rainy', 'All Season'];
const CONDITIONS = ['Ready', 'Laundry', 'Repair', 'Donate'];

const COLOR_LIBRARY = [
  { name: 'White',    hex: '#f6f1e9', rgb: [246, 241, 233], tone: 'neutral' },
  { name: 'Black',    hex: '#121316', rgb: [18,  19,  22 ], tone: 'neutral' },
  { name: 'Navy',     hex: '#1f2e46', rgb: [31,  46,  70 ], tone: 'cool'    },
  { name: 'Blue',     hex: '#76a9e6', rgb: [118, 169, 230], tone: 'cool'    },
  { name: 'Brown',    hex: '#8b4f27', rgb: [139, 79,  39 ], tone: 'warm'    },
  { name: 'Beige',    hex: '#c7b79e', rgb: [199, 183, 158], tone: 'warm'    },
  { name: 'Grey',     hex: '#8f949c', rgb: [143, 148, 156], tone: 'neutral' },
  { name: 'Green',    hex: '#587c58', rgb: [88,  124, 88 ], tone: 'earth'   },
  { name: 'Burgundy', hex: '#743044', rgb: [116, 48,  68 ], tone: 'warm'    },
  { name: 'Cream',    hex: '#eadfcf', rgb: [234, 223, 207], tone: 'warm'    },
];

const TONE_RULES = {
  neutral: ['neutral', 'warm', 'cool', 'earth'],
  warm:    ['neutral', 'warm', 'earth'],
  cool:    ['neutral', 'cool'],
  earth:   ['neutral', 'warm', 'earth'],
};

// ─────────────────────────────────────────────
// THUMBNAIL GENERATOR (offline SVG)
// ─────────────────────────────────────────────
function makeThumb(name, category, colorName) {
  const color = COLOR_LIBRARY.find(c => c.name === colorName) || COLOR_LIBRARY[0];
  const icon  = category === 'Shoes' ? '◖◗'
              : category === 'Accessories' ? '◌'
              : category === 'Trousers' ? '▥' : '▰';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="520" viewBox="0 0 420 520">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#272b33"/><stop offset="1" stop-color="#0b0d12"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="35%" r="60%">
        <stop offset="0" stop-color="${color.hex}" stop-opacity="0.42"/>
        <stop offset="1" stop-color="${color.hex}" stop-opacity="0"/>
      </radialGradient>
      <filter id="sh"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#000" flood-opacity="0.42"/></filter>
    </defs>
    <rect width="420" height="520" rx="44" fill="url(#bg)"/>
    <rect width="420" height="520" rx="44" fill="url(#glow)"/>
    <circle cx="210" cy="230" r="128" fill="${color.hex}" opacity="0.18"/>
    <text x="210" y="265" text-anchor="middle" font-size="132" font-family="Arial" fill="${color.hex}" opacity="0.96" filter="url(#sh)">${icon}</text>
    <text x="36" y="426" font-size="30" font-weight="700" font-family="Inter,Arial" fill="#f8fafc">${name.replace(/&/g,'and')}</text>
    <text x="36" y="468" font-size="22" font-family="Inter,Arial" fill="#a6adbb">${category} • ${color.name}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ─────────────────────────────────────────────
// STARTER WARDROBE
// ─────────────────────────────────────────────
function mkItem(name, category, color, occasions, seasons, formality, wearCount, value) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    name, category, color, occasions, seasons, formality, wearCount, value,
    condition: 'Ready', favorite: false,
    lastWorn: wearCount > 15 ? 'Today' : 'This month',
    notes: '',
    image: makeThumb(name, category, color),
  };
}

const starterItems = [];

// ─────────────────────────────────────────────
// LOCAL STORAGE HOOK
// ─────────────────────────────────────────────
function useLS(key, def) {
  const [val, setVal] = useState(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }
    catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

// ─────────────────────────────────────────────
// ALGORITHMS
// ─────────────────────────────────────────────
function scoreItem(item, occasion, formality, season) {
  let s = 0;
  if (item.occasions.includes(occasion)) s += 38;
  if (item.occasions.includes('Smart Casual') && occasion === 'Date Night') s += 16;
  if (item.seasons.includes(season) || item.seasons.includes('All Season') || season === 'All Season') s += 16;
  s += Math.max(0, 20 - Math.abs(item.formality - formality) * 5);
  s += item.favorite ? 8 : 0;
  s += Math.min(10, item.wearCount / 4);
  return s;
}

function judgeColor(items) {
  const tones = items.map(i => (COLOR_LIBRARY.find(c => c.name === i.color) || COLOR_LIBRARY[0]).tone);
  if (!tones.length) return 7;
  const main = tones[0];
  let score = 7;
  for (const t of tones.slice(1)) score += TONE_RULES[main]?.includes(t) ? 0.75 : -0.8;
  const unique = new Set(items.map(i => i.color));
  if (unique.size <= 3) score += 0.8;
  if (unique.size >= 5) score -= 1;
  return Math.max(4.5, Math.min(9.6, score));
}

function rangeOf(vals) {
  if (!vals.length) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

function roundM(v) { return Math.round(Math.max(1, Math.min(10, v)) * 10) / 10; }

function buildOutfit(items, event = 'smart casual', season = 'All Season', weather = '', mood = '') {
  const text = `${event} ${weather} ${mood}`.toLowerCase();
  const targetOccasion = text.includes('formal') ? 'Formal'
    : text.includes('business') ? 'Business Casual'
    : text.includes('date') || text.includes('dinner') ? 'Date Night'
    : 'Smart Casual';
  const targetFormality = targetOccasion === 'Formal' ? 5
    : targetOccasion === 'Business Casual' ? 4
    : targetOccasion === 'Smart Casual' || targetOccasion === 'Date Night' ? 3 : 2;
  const needed = ['Shirts', 'Trousers', 'Shoes', 'Jackets', 'Accessories'];
  const picked = [];
  for (const cat of needed) {
    const cands = items.filter(i => i.category === cat && i.condition === 'Ready');
    if (!cands.length) continue;
    picked.push(cands.map(i => ({ item: i, score: scoreItem(i, targetOccasion, targetFormality, season) }))
      .sort((a, b) => b.score - a.score)[0].item);
  }
  const finalItems = picked.length >= 3 ? picked : items.slice(0, 4);
  const colorScore = judgeColor(finalItems);
  const confidence = Math.min(96, Math.round(62 + colorScore * 3 + finalItems.length * 3));
  return {
    title: `${targetOccasion} outfit`,
    confidence,
    items: finalItems,
    reasons: [
      'Balanced base layers chosen from your actual closet.',
      `${targetOccasion} tags and formality scores match the request.`,
      'Color tones are coordinated to avoid random combinations.',
      'Every recommendation is generated from local wardrobe data.',
    ],
    upgrades: recommendUpgrades(finalItems, targetOccasion),
  };
}

function judgeOutfit(items) {
  const cats = new Set(items.map(i => i.category));
  const hasBase = ['Shirts', 'Trousers', 'Shoes'].every(c => cats.has(c));
  const color = judgeColor(items);
  const fVals = items.map(i => i.formality || 3);
  const avgF  = fVals.reduce((a, b) => a + b, 0) / Math.max(fVals.length, 1);
  const cohesion     = Math.max(5, 10 - rangeOf(fVals) * 1.25);
  const completeness = hasBase ? 8.8 : 6.8;
  const occasionFit  = Math.min(10, avgF * 1.8 + (cats.has('Jackets') ? 0.8 : 0));
  const score = ((color + cohesion + completeness + occasionFit) / 4).toFixed(1);
  const suggestions = [];
  if (!cats.has('Accessories')) suggestions.push('Add a watch or belt — small details finish the look.');
  if (!cats.has('Jackets') && avgF > 3) suggestions.push('A blazer or jacket would make this feel intentional.');
  if (color < 7.5) suggestions.push('Reduce competing color families for better harmony.');
  if (!cats.has('Shoes')) suggestions.push('Shoes are missing — the outfit cannot be fully judged.');
  if (!suggestions.length) suggestions.push('Strong outfit. Try one texture upgrade to make it premium.');
  return {
    title: Number(score) >= 8 ? 'Great base outfit'
         : Number(score) >= 7 ? 'Good, but sharpen it'
         : 'Needs a stronger foundation',
    summary: Number(score) >= 8
      ? 'Balanced, occasion-aware, and easy to wear.'
      : 'Potential is here, but one or two choices are weakening the final look.',
    score,
    metrics: [
      { label: 'Overall Balance',  value: roundM(completeness) },
      { label: 'Color Harmony',    value: roundM(color)        },
      { label: 'Occasion Fit',     value: roundM(occasionFit)  },
      { label: 'Style Cohesion',   value: roundM(cohesion)     },
    ],
    suggestions,
  };
}

function recommendUpgrades(items, occasion) {
  const cats = new Set(items.map(i => i.category));
  const upgrades = [];
  if (!cats.has('Accessories')) upgrades.push('Add a watch or belt to make the look feel finished.');
  if (occasion.includes('Formal') && !items.some(i => i.name.toLowerCase().includes('black')))
    upgrades.push('A black formal shoe would unlock stronger formal looks.');
  if (!cats.has('Jackets')) upgrades.push('A neutral outer layer would create more complete outfits.');
  if (!upgrades.length) upgrades.push('This outfit is strong. Upgrade with texture: knit, leather, or linen.');
  return upgrades;
}

function auditWardrobe(items) {
  const colors = ['#8b7cf6','#6ee7b7','#60a5fa','#f59e0b','#f472b6','#a3e635','#c084fc'];
  const categoryBreakdown = CATEGORIES.map((name, i) => ({
    name, count: items.filter(x => x.category === name).length, color: colors[i % colors.length],
  })).filter(x => x.count);
  let start = 0;
  const total = Math.max(items.length, 1);
  const segments = categoryBreakdown.map(c => {
    const deg = (c.count / total) * 360;
    const seg = `${c.color} ${start}deg ${start + deg}deg`;
    start += deg;
    return seg;
  });
  const donut = `conic-gradient(${segments.join(', ') || '#333 0deg 360deg'})`;
  const coverage = [
    cover(items, 'Smart Casual',    '👔', '#8b7cf6'),
    cover(items, 'Business Casual', '💼', '#6ee7b7'),
    cover(items, 'Formal',          '🎩', '#a3e635'),
    cover(items, 'Casual',          '👕', '#60a5fa'),
    coverSeason(items, 'Summer',    '☀️', '#fde68a'),
    coverSeason(items, 'Winter',    '🧥', '#c084fc'),
  ];
  const blindspots = [];
  if (items.filter(i => i.category === 'Jackets').length < 3)
    blindspots.push({ icon:'🧥', title:'Missing versatile outerwear',  detail:'Add a navy, black or olive jacket.', level:'High' });
  if (!items.some(i => i.category === 'Shoes' && i.formality >= 4 && ['Black','Brown'].includes(i.color)))
    blindspots.push({ icon:'👞', title:'Need one formal shoe option',  detail:'A black Oxford or derby increases formal coverage.', level:'Medium' });
  if (coverage.find(c => c.label === 'Summer')?.value < 60)
    blindspots.push({ icon:'☀️', title:'Low summer smart-casual coverage', detail:'Add breathable shirts, polos or linen.', level:'Low' });
  if (items.filter(i => i.category === 'Accessories').length < 2)
    blindspots.push({ icon:'⌚', title:'Accessories underdeveloped', detail:'Small details make basic outfits feel premium.', level:'Medium' });
  return {
    categoryBreakdown, donut, coverage, blindspots: blindspots.slice(0, 4),
    upgrades: [
      'Neutral lightweight jacket — unlocks dinner, business casual, and rainy-day looks.',
      'Black formal shoe — improves interviews, events, church, and formal dinners.',
      'Breathable summer shirt — fixes hot-weather smart-casual gaps.',
      'Quality belt + watch combo — makes simple outfits look deliberate.',
    ],
  };
}

function cover(items, occasion, icon, color) {
  const req = ['Shirts','Trousers','Shoes'];
  const cnt = req.filter(cat => items.some(i => i.category === cat && i.occasions.includes(occasion))).length;
  const bonus = items.some(i => i.category === 'Jackets' && i.occasions.includes(occasion)) ? 12 : 0;
  return { label: occasion, icon, value: Math.min(96, Math.round((cnt / req.length) * 78 + bonus)), color };
}

function coverSeason(items, season, icon, color) {
  const req = ['Shirts','Trousers','Shoes'];
  const cnt = req.filter(cat => items.some(i => i.category === cat && (i.seasons.includes(season) || i.seasons.includes('All Season')))).length;
  const bonus = items.some(i => i.category === 'Jackets' && i.seasons.includes(season)) ? 12 : 0;
  return { label: season, icon, value: Math.min(96, Math.round((cnt / req.length) * 78 + bonus)), color };
}

function buildCapsule(items, goal) {
  const text   = goal.toLowerCase();
  const target = text.includes('formal') ? 'Formal' : text.includes('business') ? 'Business Casual' : 'Smart Casual';
  const ranked = items
    .map(i => ({ item: i, score: scoreItem(i, target, target === 'Formal' ? 5 : 3, 'All Season') + (['White','Black','Navy','Grey','Beige','Cream'].includes(i.color) ? 8 : 0) }))
    .sort((a, b) => b.score - a.score).map(x => x.item);
  const byCat = [];
  for (const cat of ['Shirts','Trousers','Shoes','Jackets','Knitwear','Accessories'])
    byCat.push(...ranked.filter(i => i.category === cat).slice(0, cat === 'Accessories' ? 2 : 3));
  const selected = Array.from(new Map(byCat.map(i => [i.id, i])).values()).slice(0, 10);
  const outfit   = selected.filter(i => ['Shirts','Trousers','Shoes','Jackets','Accessories'].includes(i.category)).slice(0, 5);
  return {
    title: `${target} capsule`,
    score: Math.min(98, 62 + selected.length * 4),
    items: selected, outfit,
    days: [
      { day:'Mon', look:'Clean shirt + chinos + derby shoes' },
      { day:'Tue', look:'Polo + dark trousers + sneakers'   },
      { day:'Wed', look:'Oxford shirt + blazer + brown shoes'},
      { day:'Thu', look:'Knit layer + chinos + accessory'   },
      { day:'Fri', look:'Date-night neutral layers'          },
      { day:'Sat', look:'Relaxed casual base outfit'         },
      { day:'Sun', look:'Smart clean reset look'             },
    ],
  };
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function estimateColorName(dataUrl) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 48, 48);
      const data = ctx.getImageData(0, 0, 48, 48).data;
      let r=0, g=0, b=0, cnt=0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i+3] < 40) continue;
        r += data[i]; g += data[i+1]; b += data[i+2]; cnt++;
      }
      if (!cnt) return res('Grey');
      const avg = [r/cnt, g/cnt, b/cnt];
      res(COLOR_LIBRARY.map(c => ({ name:c.name, d: Math.hypot(avg[0]-c.rgb[0], avg[1]-c.rgb[1], avg[2]-c.rgb[2]) })).sort((a,b)=>a.d-b.d)[0].name);
    };
    img.onerror = () => res('Grey');
    img.src = dataUrl;
  });
}

function guessFromFilename(filename) {
  const raw = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').toLowerCase();
  const category = raw.includes('shoe') || raw.includes('sneaker') || raw.includes('loafer') ? 'Shoes'
    : raw.includes('chino') || raw.includes('jean') || raw.includes('trouser') || raw.includes('pant') ? 'Trousers'
    : raw.includes('jacket') || raw.includes('blazer') || raw.includes('coat') ? 'Jackets'
    : raw.includes('watch') || raw.includes('belt') ? 'Accessories'
    : raw.includes('sweater') || raw.includes('knit') ? 'Knitwear' : 'Shirts';
  const name = raw.split(' ').filter(Boolean).map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') || `New ${category.slice(0,-1)}`;
  return { name, category, formality: category === 'Shoes' || category === 'Jackets' ? 3 : 2, occasions:['Casual','Smart Casual'], seasons:['All Season'] };
}

function shortOccasion(text) { return text.split(',')[0].trim().toLowerCase() || 'the occasion'; }

function today() { return new Date().toISOString().split('T')[0]; }

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
export default function App() {
  const [items,   setItems]   = useLS(STORAGE_KEY,  starterItems);
  const [history, setHistory] = useLS(HISTORY_KEY,  []);
  const [calendar,setCalendar]= useLS(CALENDAR_KEY, {});
  const [mood,    setMood]    = useLS(MOOD_KEY,     []);
  const [packing, setPacking] = useLS(PACKING_KEY,  []);

  const [active,     setActive]     = useState('closet');
  const [selected,   setSelected]   = useState([]);
  const [lastOutfit, setLastOutfit] = useState(null);
  const [toast,      setToast]      = useState('');

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2400); }

  function upsertItem(next) {
    setItems(old => {
      const exists = old.some(i => i.id === next.id);
      return exists ? old.map(i => i.id === next.id ? next : i) : [next, ...old];
    });
    notify('Wardrobe saved ✓');
  }

  function deleteItem(id) {
    setItems(old => old.filter(i => i.id !== id));
    setSelected(old => old.filter(x => x !== id));
    notify('Item removed');
  }

  function wearOutfit(outfit) {
    const ids = outfit.map(x => x.id);
    setItems(old => old.map(i => ids.includes(i.id) ? { ...i, wearCount: i.wearCount + 1, lastWorn: 'Today' } : i));
    notify('Wear count updated');
  }

  function saveToHistory(outfit, name) {
    const entry = { id: Date.now(), name: name || outfit.title, date: today(), items: outfit.items.map(i=>i.id) };
    setHistory(old => [entry, ...old].slice(0, 50));
    notify(`"${entry.name}" saved to history`);
  }

  const nav = [
    { id:'closet',  label:'Closet',  Icon: Shirt          },
    { id:'stylist', label:'Stylist', Icon: Wand2           },
    { id:'judge',   label:'Judge',   Icon: ClipboardCheck  },
    { id:'auditor', label:'Auditor', Icon: BarChart3        },
    { id:'more',    label:'More',    Icon: MoreHorizontal  },
  ];

  const titles = {
    closet:  ['My Closet',        'Catalog and manage everything you actually own.'],
    stylist: ['AI Stylist',       'Build occasion-ready outfits from your real wardrobe.'],
    judge:   ['Outfit Judge',     'Score combinations and discover what is missing.'],
    auditor: ['Wardrobe Auditor', 'Find gaps, waste, coverage, and upgrade priorities.'],
    more:    ['More',             'History, calendar, mood board, and packing lists.'],
  };

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar glass-panel">
        <div className="brand-row">
          <div className="brand-mark">W</div>
          <div><h1>Wardrobe OS</h1><p>Private style intelligence</p></div>
        </div>
        <div className="trust-card">
          <Lock size={18}/>
          <div><strong>Local-first</strong><span>Your data stays in this browser only.</span></div>
        </div>
        <nav>
          {nav.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActive(id)} className={active===id ? 'nav-button active' : 'nav-button'}>
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <PremiumScore items={items}/>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">Wardrobe intelligence</p>
            <h2>{titles[active][0]}</h2>
            <p>{titles[active][1]}</p>
          </div>
          <div className="topbar-actions">
            <div className="pill"><Archive size={16}/> {items.length} items</div>
            <div className="pill success"><Sparkles size={16}/> v2 — offline</div>
          </div>
        </header>

        <div className="screen">
          {active==='closet'  && <ClosetScreen  items={items} upsertItem={upsertItem} deleteItem={deleteItem} selected={selected} setSelected={setSelected} notify={notify} wearOutfit={wearOutfit}/>}
          {active==='stylist' && <StylistScreen items={items} setSelected={setSelected} setLastOutfit={setLastOutfit} goJudge={()=>setActive('judge')} wearOutfit={wearOutfit} saveToHistory={saveToHistory}/>}
          {active==='judge'   && <JudgeScreen   items={items} selected={selected} setSelected={setSelected} lastOutfit={lastOutfit} setLastOutfit={setLastOutfit} goStylist={()=>setActive('stylist')} saveToHistory={saveToHistory}/>}
          {active==='auditor' && <AuditorScreen items={items}/>}
          {active==='more'    && <MoreScreen    items={items} history={history} setHistory={setHistory} calendar={calendar} setCalendar={setCalendar} mood={mood} setMood={setMood} packing={packing} setPacking={setPacking} notify={notify}/>}
        </div>
      </main>

      {/* ── MOBILE NAV ── */}
      <div className="mobile-tabs glass-panel">
        {nav.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActive(id)} className={active===id ? 'mobile-tab active' : 'mobile-tab'}>
            <Icon size={18}/><span>{label}</span>
          </button>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// PREMIUM SCORE WIDGET
// ─────────────────────────────────────────────
function PremiumScore({ items }) {
  const ready = items.filter(i => i.condition==='Ready').length;
  const score = Math.round((ready / Math.max(items.length,1)) * 55 + Math.min(items.length,40));
  const costs = items.map(i => i.value && i.wearCount ? i.value / i.wearCount : 0).filter(Boolean);
  const avgCPW = costs.length ? (costs.reduce((a,b)=>a+b,0)/costs.length).toFixed(1) : '—';
  return (
    <div className="premium-score">
      <div className="score-ring" style={{'--score':`${score}%`}}>
        <span>{score}</span>
      </div>
      <div>
        <strong>Style score</strong>
        <p>Avg $cost/wear: ${avgCPW}</p>
        <p>{items.filter(i=>i.favorite).length} favourites</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CLOSET SCREEN
// ─────────────────────────────────────────────
function ClosetScreen({ items, upsertItem, deleteItem, selected, setSelected, notify, wearOutfit }) {
  const [search,   setSearch]   = useState('');
  const [catFilter,setCatFilter]= useState('All');
  const [editing,  setEditing]  = useState(null);
  const fileRef = useRef();

  const filtered = useMemo(() => {
    let res = items;
    if (catFilter !== 'All') res = res.filter(i => i.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.color.toLowerCase().includes(q) ||
        i.occasions.some(o=>o.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q)
      );
    }
    return res;
  }, [items, catFilter, search]);

  const stats = useMemo(() => {
    const ready   = items.filter(i=>i.condition==='Ready').length;
    const fav     = items.filter(i=>i.favorite).length;
    const totalVal= items.reduce((s,i)=>s+(i.value||0),0);
    const totalW  = items.reduce((s,i)=>s+(i.wearCount||0),0);
    return { ready, fav, totalVal, totalW };
  }, [items]);

  const [analyzing, setAnalyzing] = useState(false);

  async function handleFiles(files) {
    setAnalyzing(true);
    notify(`Analyzing ${files.length} item${files.length > 1 ? 's' : ''}...`);
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const aiData = await analyzeImage(dataUrl);
        
        const newItem = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          image: dataUrl,
          name: aiData?.name || file.name.split('.')[0],
          category: aiData?.category || 'Shirts',
          color: aiData?.color || 'White',
          occasions: aiData?.occasions || ['Casual'],
          seasons: aiData?.seasons || ['All Season'],
          formality: aiData?.formality || 3,
          condition: 'Ready',
          favorite: false,
          wearCount: 0,
          value: 0,
          lastWorn: 'Never',
          notes: '',
        };
        upsertItem(newItem);
      } catch (err) {
        console.error("AI Analysis failed:", err);
        notify("Failed to analyze one or more items.");
      }
    }
    setAnalyzing(false);
    notify("Wardrobe updated!");
  }

  function toggleSelect(id) {
    setSelected(old => old.includes(id) ? old.filter(x=>x!==id) : [...old, id]);
  }

  function logWear(item) {
    upsertItem({ ...item, wearCount: item.wearCount+1, lastWorn:'Today' });
    notify(`Wear logged for "${item.name}"`);
  }

  return (
    <div className="closet-layout">
      {/* Stats */}
      <div className="glass-panel closet-hero">
        <div>
          <p className="eyebrow">Wardrobe overview</p>
          <h3>{items.length} items cataloged</h3>
          <div className="hero-actions" style={{marginTop:14}}>
            <button className="button primary" onClick={()=>fileRef.current.click()} disabled={analyzing}>
              {analyzing ? <RefreshCw className="spin" size={16}/> : <Camera size={16}/>}
              {analyzing ? " AI Analyzing..." : " Add clothing"}
            </button>
            <button className="button ghost" onClick={()=>setEditing({id:'new',name:'',category:'Shirts',color:'White',occasions:['Casual'],seasons:['All Season'],formality:2,condition:'Ready',favorite:false,wearCount:0,value:0,lastWorn:'Never',notes:'',image:''})}>
              <Plus size={16}/> Manual entry
            </button>
          </div>
        </div>
        <div className="stats-grid">
          {[
            { Icon:PackageCheck, val:stats.ready,    lbl:'Ready to wear'   },
            { Icon:Heart,        val:stats.fav,      lbl:'Favourites'      },
            { Icon:CircleDollarSign,val:`$${stats.totalVal}`, lbl:'Total value'  },
            { Icon:TrendingUp,   val:stats.totalW,   lbl:'Total wears'     },
          ].map(({ Icon,val,lbl }) => (
            <div key={lbl} className="metric-card glass-panel">
              <div className="metric-icon"><Icon size={20}/></div>
              <div><span>{lbl}</span><strong>{val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel toolbar">
        <div className="search-box">
          <Search size={16} color="#737b8d"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, color, occasion…"/>
          {search && <button style={{background:'none',border:'none',color:'#737b8d',cursor:'pointer'}} onClick={()=>setSearch('')}><X size={14}/></button>}
        </div>
        <div className="chip-row scrollable">
          {['All',...CATEGORIES].map(f => (
            <button key={f} onClick={()=>setCatFilter(f)} className={catFilter===f ? 'chip active' : 'chip'}>{f}</button>
          ))}
        </div>
        {selected.length>0 && (
          <div style={{display:'flex',gap:10,alignItems:'center',padding:'4px 0'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{selected.length} selected</span>
            <button className="button ghost" style={{minHeight:36}} onClick={()=>{
              const selItems = items.filter(i=>selected.includes(i.id));
              wearOutfit(selItems);
              setSelected([]);
            }}><Clock3 size={14}/> Log wear</button>
            <button className="button ghost" style={{minHeight:36,color:'var(--rose)'}} onClick={()=>{ selected.forEach(deleteItem); setSelected([]); }}>
              <Trash2 size={14}/> Delete
            </button>
            <button className="button ghost" style={{minHeight:36}} onClick={()=>setSelected([])}><X size={14}/> Clear</button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="wardrobe-grid">
        {filtered.map(item => (
          <article key={item.id} className={selected.includes(item.id) ? 'item-card selected' : 'item-card'}>
            <div className="item-image-wrap">
              <img src={item.image || makeThumb(item.name,item.category,item.color)} alt={item.name}/>
              <button className={item.favorite?'float-btn fav on':'float-btn fav'} onClick={()=>upsertItem({...item,favorite:!item.favorite})}>
                <Heart size={14} fill={item.favorite?'currentColor':'none'}/>
              </button>
              <button className="float-btn edit" onClick={()=>setEditing(item)}><Edit3 size={14}/></button>
              {selected.includes(item.id) && <div style={{position:'absolute',inset:0,background:'rgba(139,124,246,.18)',display:'grid',placeItems:'center'}}><Check size={30} color="white"/></div>}
            </div>
            <div className="item-body">
              <div>
                <h4>{item.name}</h4>
                <p>
                  <span className="dot" style={{background:(COLOR_LIBRARY.find(c=>c.name===item.color)||COLOR_LIBRARY[0]).hex}}/>
                  {item.color} · {item.category}
                </p>
              </div>
              <button className="trash" onClick={()=>deleteItem(item.id)}><Trash2 size={14}/></button>
            </div>
            <div className="mini-tags">
              <span style={{background:'rgba(139,124,246,.15)',color:'var(--violet-2)'}}>{item.condition}</span>
              <span>×{item.wearCount} wears</span>
              {item.occasions.slice(0,1).map(o=><span key={o}>{o}</span>)}
              <button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:11,padding:'2px 4px'}}
                onClick={()=>{ toggleSelect(item.id); }}>
                {selected.includes(item.id) ? '✓ selected' : '+ select'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel" style={{padding:48,textAlign:'center'}}>
          <Shirt size={40} color="#3a3d50" style={{margin:'0 auto 16px'}}/>
          <p style={{color:'var(--muted)'}}>
            {search ? `No results for "${search}"` : 'No items in this category. Add your first piece!'}
          </p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>
      {editing && <ItemModal item={editing} onSave={upsertItem} onClose={()=>setEditing(null)} onDelete={deleteItem} logWear={logWear}/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// ITEM MODAL (edit / create)
// ─────────────────────────────────────────────
function ItemModal({ item, onSave, onClose, onDelete, logWear }) {
  const [form, setForm] = useState({ ...item });
  const fileRef = useRef();
  const isNew = item.id === 'new';

  async function handleImg(e) {
    const file = e.target.files[0]; if (!file) return;
    const dataUrl   = await fileToDataUrl(file);
    const colorName = await estimateColorName(dataUrl);
    setForm(f => ({ ...f, image: dataUrl, color: colorName }));
  }

  function toggleTag(arr, val) {
    return arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val];
  }

  function handleSave() {
    const saved = {
      ...form,
      id: isNew ? (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())) : form.id,
      image: form.image || makeThumb(form.name, form.category, form.color),
    };
    onSave(saved);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="glass-panel modal">
        <div className="modal-header">
          <h3>{isNew ? 'Add clothing item' : 'Edit item'}</h3>
          <button className="icon-button" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-grid">
          {/* Image */}
          <div>
            <div className="image-editor" onClick={()=>fileRef.current.click()}>
              {form.image ? <img src={form.image} alt=""/> : <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:8,color:'var(--muted)'}}><ImagePlus size={28}/><span style={{fontSize:13}}>Tap to upload photo</span></div>}
              <div><Camera size={14}/><span style={{fontSize:12}}>Change photo</span></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg}/>

            {/* Wear tracking */}
            {!isNew && (
              <div className="glass-panel" style={{padding:14,marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Times worn</div>
                  <div style={{fontSize:28,fontWeight:700}}>{form.wearCount}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>Last: {form.lastWorn}</div>
                </div>
                <button className="button primary" style={{minHeight:38,padding:'0 14px'}} onClick={()=>{ setForm(f=>({...f,wearCount:f.wearCount+1,lastWorn:'Today'})); }}>
                  <Clock3 size={14}/> +1 Wear
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <div>
            <div className="form-grid">
              <label>Name<input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. White Oxford Shirt"/></label>
              <label>Category
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </label>
              <label>Color
                <select value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))}>
                  {COLOR_LIBRARY.map(c=><option key={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label>Condition
                <select value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}>
                  {CONDITIONS.map(c=><option key={c}>{c}</option>)}
                </select>
              </label>
              <label>Formality (1–5)<input type="number" min={1} max={5} value={form.formality} onChange={e=>setForm(f=>({...f,formality:+e.target.value}))}/></label>
              <label>Value ($)<input type="number" min={0} value={form.value} onChange={e=>setForm(f=>({...f,value:+e.target.value}))}/></label>
            </div>

            <div className="tag-section">
              <div>
                <p className="eyebrow" style={{marginBottom:8}}>Occasions</p>
                <div className="chip-row" style={{flexWrap:'wrap'}}>
                  {OCCASIONS.map(o=>(
                    <button key={o} className={form.occasions.includes(o)?'chip active':'chip'} onClick={()=>setForm(f=>({...f,occasions:toggleTag(f.occasions,o)}))}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow" style={{marginBottom:8}}>Seasons</p>
                <div className="chip-row" style={{flexWrap:'wrap'}}>
                  {SEASONS.map(s=>(
                    <button key={s} className={form.seasons.includes(s)?'chip active':'chip'} onClick={()=>setForm(f=>({...f,seasons:toggleTag(f.seasons,s)}))}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <label className="notes-field">Notes<textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Fit notes, care instructions, brand…"/></label>
            </div>

            <div className="modal-actions">
              {!isNew && <button className="button ghost" style={{color:'var(--rose)'}} onClick={()=>{ onDelete(form.id); onClose(); }}><Trash2 size={16}/> Delete</button>}
              <button className="button ghost" onClick={onClose}>Cancel</button>
              <button className="button primary" onClick={handleSave}>Save item</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLIST SCREEN
// ─────────────────────────────────────────────
import { getAISuggestion, analyzeImage } from './gemini';

// ... existing imports ...

// ... (skipping to StylistScreen) ...

function StylistScreen({ items, setSelected, setLastOutfit, goJudge, wearOutfit, saveToHistory }) {
  const [event,  setEvent]  = useState('Smart casual dinner');
  const [season, setSeason] = useState('All Season');
  const [weather,setWeather]= useState('');
  const [mood,   setMood]   = useState('');
  const [outfit, setOutfit] = useState(() => buildOutfit(items));
  const [saveName,setSaveName]=useState('');
  const [loading, setLoading] = useState(false);

  async function generate() { 
    setLoading(true);
    const aiResult = await getAISuggestion(items, event, season, weather, mood);
    
    if (aiResult) {
      const selectedItems = aiResult.itemIds.map(id => items.find(i => i.id === id)).filter(Boolean);
      setOutfit({
        title: aiResult.title,
        confidence: aiResult.confidence,
        items: selectedItems,
        reasons: aiResult.reasons,
        upgrades: aiResult.upgrades
      });
    } else {
      // Fallback to local algorithm if AI fails
      setOutfit(buildOutfit(items, event, season, weather, mood));
    }
    setLoading(false);
  }

  function goToJudge() {
    setSelected(outfit.items.map(i=>i.id));
    setLastOutfit(outfit.items);
    goJudge();
  }

  return (
    <div className="stylist-grid">
      {/* Command */}
      <section className="glass-panel stylist-command">
        <p className="eyebrow">Ask the stylist</p>
        <h3>Tell it the situation.</h3>
        <p style={{marginTop:6,color:'var(--muted)'}}>Powered by Google Gemini AI.</p>
        <div className="big-input"><MessageSquareText size={20}/><textarea value={event} onChange={e=>setEvent(e.target.value)}/></div>
        <div className="control-grid">
          <label>Season<select value={season} onChange={e=>setSeason(e.target.value)}>{SEASONS.map(s=><option key={s}>{s}</option>)}</select></label>
          <label>Weather<input value={weather} onChange={e=>setWeather(e.target.value)} placeholder="e.g. warm, cold"/></label>
          <label>Mood<input value={mood} onChange={e=>setMood(e.target.value)} placeholder="e.g. confident"/></label>
        </div>
        <button className="button primary wide" onClick={generate} disabled={loading}>
          {loading ? <RefreshCw className="spin" size={18}/> : <Sparkles size={18}/>} 
          {loading ? ' Consulting Gemini...' : ' Generate outfit'}
        </button>
      </section>

      {/* Phone mock */}
      <section className="phone-mock glass-panel">
        <div className="phone-status"><span>9:41</span><span>●●●</span></div>
        <div className="chat-screen">
          <div className="bubble user">{event}</div>
          <div className="bubble ai">
            {loading ? "Analyzing your wardrobe..." : `Got it. Here's a grounded outfit from your wardrobe for ${shortOccasion(event)}.`}
          </div>
          <div className="outfit-strip" style={{opacity: loading ? 0.5 : 1}}>
            {outfit.items.map(i=><MiniItem key={i.id} item={i}/>)}
          </div>
          {!loading && (
            <div className="reason-card">
              <strong>Why this works</strong>
              {outfit.reasons.map(r=><p key={r}><Check size={14}/> {r}</p>)}
            </div>
          )}
          <div className="message-bar">Ask for a variation… <button onClick={generate} disabled={loading}><Zap size={16}/></button></div>
        </div>
      </section>

      {/* Recommendation */}
      <section className="glass-panel recommendation-panel" style={{opacity: loading ? 0.5 : 1}}>
        <div className="section-head">
          <div><p className="eyebrow">Recommended outfit</p><h3>{outfit.title}</h3></div>
          <div className="score-badge">{outfit.confidence}%</div>
        </div>
        <div className="large-outfit-grid">
          {outfit.items.map(i=><OutfitItem key={i.id} item={i}/>)}
        </div>
        <div className="insight-list">
          {outfit.upgrades.map(u=><div key={u}><Sparkles size={16}/> {u}</div>)}
        </div>

        {/* Save to history */}
        <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
          <input
            style={{flex:1,background:'rgba(0,0,0,.2)',border:'1px solid var(--line)',borderRadius:12,padding:'0 12px',minHeight:40,color:'white',outline:'none'}}
            placeholder="Name this look…"
            value={saveName} onChange={e=>setSaveName(e.target.value)}
          />
          <button className="button primary" style={{minHeight:40,padding:'0 14px'}} onClick={()=>{ saveToHistory(outfit, saveName); setSaveName(''); }}>
            <Star size={16}/> Save
          </button>
        </div>

        <div className="action-row" style={{marginTop:10}}>
          <button className="button ghost" onClick={generate}><RefreshCw size={18}/> Another</button>
          <button className="button ghost" onClick={()=>wearOutfit(outfit.items)}><CalendarDays size={18}/> Mark worn</button>
          <button className="button primary" onClick={goToJudge}><Gauge size={18}/> Judge it</button>
        </div>
      </section>
    </div>
  );
}

function MiniItem({ item }) {
  return (
    <div className="mini-item">
      <img src={item.image || makeThumb(item.name,item.category,item.color)} alt=""/>
      <span>{item.name}</span>
    </div>
  );
}

function OutfitItem({ item }) {
  return (
    <article className="outfit-item">
      <img src={item.image || makeThumb(item.name,item.category,item.color)} alt={item.name}/>
      <div><strong>{item.name}</strong><span>{item.color} · {item.category}</span></div>
    </article>
  );
}

// ─────────────────────────────────────────────
// JUDGE SCREEN
// ─────────────────────────────────────────────
function JudgeScreen({ items, selected, setSelected, lastOutfit, setLastOutfit, goStylist, saveToHistory }) {
  const selectedItems = items.filter(i => selected.includes(i.id));
  const outfit = selectedItems.length ? selectedItems : lastOutfit || buildOutfit(items).items;
  const verdict = useMemo(() => judgeOutfit(outfit), [outfit]);

  function toggle(id) { setSelected(old => old.includes(id) ? old.filter(x=>x!==id) : [...old, id]); }

  const scoreColor = s => s >= 8 ? 'var(--green)' : s >= 7 ? 'var(--amber)' : 'var(--rose)';

  return (
    <div className="judge-layout">
      <section className="glass-panel judge-main">
        <div className="section-head">
          <div>
            <p className="eyebrow">AI outfit judge</p>
            <h3 style={{color: scoreColor(Number(verdict.score))}}>{verdict.title}</h3>
            <p style={{marginTop:6,color:'var(--muted)'}}>{verdict.summary}</p>
          </div>
          <div className="score-orb" style={{background:`conic-gradient(${scoreColor(Number(verdict.score))} ${Number(verdict.score)*10}%, rgba(255,255,255,.1) 0)`}}>
            <strong>{verdict.score}</strong><span>/10</span>
          </div>
        </div>
        <div className="large-outfit-grid compact">
          {outfit.map(i=><OutfitItem key={i.id} item={i}/>)}
        </div>
        <div className="metric-list">
          {verdict.metrics.map(m=><ProgressRow key={m.label} label={m.label} value={m.value} color={scoreColor(m.value)}/>)}
        </div>
        <div className="suggestions-grid">
          {verdict.suggestions.map(s=><div key={s} className="suggestion"><Sparkles size={16}/> {s}</div>)}
        </div>
        <div className="action-row" style={{marginTop:12}}>
          <button className="button ghost" onClick={goStylist}><Wand2 size={18}/> Ask stylist</button>
          <button className="button primary" onClick={()=>saveToHistory({title:'Judged Look',items:outfit},'Judged Look')}><Star size={18}/> Save look</button>
        </div>
      </section>

      <section className="glass-panel selector-panel">
        <div className="section-head slim">
          <div><p className="eyebrow">Build your combo</p><h3>Select items to judge</h3></div>
          <Filter size={18}/>
        </div>
        <div className="selector-list">
          {items.map(i=>(
            <button key={i.id} className={selected.includes(i.id)?'selector-item active':'selector-item'} onClick={()=>toggle(i.id)}>
              <img src={i.image || makeThumb(i.name,i.category,i.color)} alt=""/>
              <div><strong>{i.name}</strong><span>{i.category} · {i.color}</span></div>
              {selected.includes(i.id) && <Check size={18}/>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressRow({ label, value, color }) {
  const c = color || (value>=8?'var(--green)':value>=6?'var(--amber)':'var(--rose)');
  return (
    <div className="progress-row">
      <div><span>{label}</span><strong style={{color:c}}>{value}/10</strong></div>
      <div className="progress-track"><span style={{width:`${value*10}%`,background:c}}/></div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUDITOR SCREEN
// ─────────────────────────────────────────────
function AuditorScreen({ items }) {
  const audit = useMemo(() => auditWardrobe(items), [items]);

  // Color palette analysis
  const palette = useMemo(() => {
    const cnt = {};
    items.forEach(i => { cnt[i.color] = (cnt[i.color]||0)+1; });
    const total = Math.max(items.length,1);
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({
      name, count, pct: Math.round(count/total*100),
      hex: (COLOR_LIBRARY.find(c=>c.name===name)||COLOR_LIBRARY[0]).hex,
    }));
  }, [items]);

  // Wear stats
  const wearStats = useMemo(() => {
    const sorted = [...items].sort((a,b)=>b.wearCount-a.wearCount);
    return { top: sorted.slice(0,5), bottom: sorted.filter(i=>i.wearCount===0).slice(0,5) };
  }, [items]);

  return (
    <div className="auditor-grid">
      {/* Donut */}
      <section className="glass-panel audit-overview">
        <div className="section-head"><div><p className="eyebrow">Wardrobe overview</p><h3>{items.length} items cataloged</h3></div><PackageCheck size={22}/></div>
        <div className="donut-wrap">
          <div className="donut" style={{background:audit.donut}}><span>{items.length}<small>items</small></span></div>
          <div className="legend-list">
            {audit.categoryBreakdown.map(c=>(
              <div key={c.name}><span className="dot" style={{background:c.color}}/>{c.name}<strong>{c.count}</strong></div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="glass-panel coverage-panel">
        <div className="section-head slim"><h3>Occasion coverage</h3><Palette size={18}/></div>
        {audit.coverage.map(row=>(
          <div key={row.label} className="coverage-row">
            <div><span>{row.icon}</span><strong>{row.label}</strong><em>{row.value}%</em></div>
            <div className="progress-track"><span style={{width:`${row.value}%`,background:row.color}}/></div>
          </div>
        ))}
      </section>

      {/* Colour Palette */}
      <section className="glass-panel" style={{padding:20}}>
        <div className="section-head slim"><h3>Colour palette</h3><Palette size={18}/></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8}}>
          {palette.map(p=>(
            <div key={p.name} style={{textAlign:'center'}}>
              <div style={{width:48,height:48,borderRadius:12,background:p.hex,border:'1px solid rgba(255,255,255,.1)',marginBottom:4}}/>
              <div style={{fontSize:11,color:'var(--soft)'}}>{p.name}</div>
              <div style={{fontSize:12,fontWeight:700}}>{p.pct}%</div>
            </div>
          ))}
        </div>
      </section>

      {/* Wear tracker */}
      <section className="glass-panel" style={{padding:20}}>
        <div className="section-head slim"><h3>Wear tracker</h3><TrendingUp size={18}/></div>
        <p className="eyebrow" style={{marginBottom:8}}>Most worn</p>
        {wearStats.top.map(i=>(
          <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--line)'}}>
            <img src={i.image||makeThumb(i.name,i.category,i.color)} style={{width:36,height:44,borderRadius:8,objectFit:'cover'}} alt=""/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{i.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{i.category}</div></div>
            <div style={{fontWeight:700,color:'var(--green)'}}>×{i.wearCount}</div>
          </div>
        ))}
        {wearStats.bottom.length>0 && <>
          <p className="eyebrow" style={{margin:'16px 0 8px'}}>Never worn</p>
          {wearStats.bottom.map(i=>(
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--line)'}}>
              <img src={i.image||makeThumb(i.name,i.category,i.color)} style={{width:36,height:44,borderRadius:8,objectFit:'cover'}} alt=""/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{i.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{i.category}</div></div>
              <div style={{fontWeight:700,color:'var(--rose)'}}>0 wears</div>
            </div>
          ))}
        </>}
      </section>

      {/* Blind spots */}
      <section className="glass-panel blindspots-panel">
        <div className="section-head slim"><h3>AI blind spots</h3><span className="pill warning">{audit.blindspots.length} active</span></div>
        <div className="blindspot-list">
          {audit.blindspots.map(b=>(
            <div key={b.title} className="blindspot">
              <div className="blind-icon">{b.icon}</div>
              <div><strong>{b.title}</strong><p>{b.detail}</p></div>
              <span className={`level ${b.level.toLowerCase()}`}>{b.level}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrades */}
      <section className="glass-panel upgrade-panel">
        <p className="eyebrow">Next best buys</p>
        <h3>Only buy what unlocks more outfits.</h3>
        <div className="upgrade-list">
          {audit.upgrades.map(u=><div key={u}><ChevronRight size={16}/> {u}</div>)}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// MORE SCREEN  (History / Calendar / Mood / Packing / Capsule)
// ─────────────────────────────────────────────
function MoreScreen({ items, history, setHistory, calendar, setCalendar, mood, setMood, packing, setPacking, notify }) {
  const [sub, setSub] = useState(null);

  const sections = [
    { id:'history',  Icon:History,      label:'Outfit History', desc:`${history.length} saved looks` },
    { id:'calendar', Icon:CalendarDays, label:'Style Calendar',  desc:'Plan daily outfits' },
    { id:'mood',     Icon:BookOpen,     label:'Mood Board',      desc:'Pin style inspiration' },
    { id:'packing',  Icon:Luggage,      label:'Packing List',    desc:'Smart travel capsule' },
    { id:'capsule',  Icon:Layers3,      label:'Capsule Studio',  desc:'Mini focused wardrobe' },
  ];

  if (sub==='history') return <HistoryScreen history={history} items={items} setHistory={setHistory} onBack={()=>setSub(null)} notify={notify}/>;
  if (sub==='calendar') return <CalendarScreen calendar={calendar} setCalendar={setCalendar} history={history} items={items} onBack={()=>setSub(null)} notify={notify}/>;
  if (sub==='mood') return <MoodScreen mood={mood} setMood={setMood} onBack={()=>setSub(null)} notify={notify}/>;
  if (sub==='packing') return <PackingScreen items={items} packing={packing} setPacking={setPacking} onBack={()=>setSub(null)} notify={notify}/>;
  if (sub==='capsule') return <CapsuleStudio items={items} onBack={()=>setSub(null)}/>;

  return (
    <div>
      <div className="auditor-grid">
        {sections.map(({ id, Icon, label, desc }) => (
          <div key={id} className="glass-panel" style={{padding:24,cursor:'pointer',transition:'.2s ease'}} onClick={()=>setSub(id)}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(139,124,246,.5)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor=''}>
            <Icon size={28} color="var(--violet-2)" style={{marginBottom:12}}/>
            <h3 style={{fontSize:18,marginBottom:6}}>{label}</h3>
            <p style={{color:'var(--muted)',fontSize:13}}>{desc}</p>
            <div style={{marginTop:16,color:'var(--violet-2)',fontSize:13,display:'flex',alignItems:'center',gap:4}}>Open <ChevronRight size={14}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORY SCREEN
// ─────────────────────────────────────────────
function HistoryScreen({ history, items, setHistory, onBack, notify }) {
  function deleteEntry(id) {
    setHistory(old => old.filter(e=>e.id!==id));
    notify('Look removed from history');
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="icon-button" onClick={onBack}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
        <h3>Outfit History</h3>
      </div>
      {history.length===0 && (
        <div className="glass-panel" style={{padding:48,textAlign:'center'}}>
          <History size={40} color="#3a3d50" style={{margin:'0 auto 16px'}}/>
          <p style={{color:'var(--muted)'}}>No saved looks yet. Generate outfits in the Stylist and save them.</p>
        </div>
      )}
      <div className="wardrobe-grid">
        {history.map(entry => {
          const entryItems = items.filter(i => entry.items.includes(i.id));
          return (
            <div key={entry.id} className="glass-panel item-card">
              <div style={{display:'flex',height:160,gap:1,overflow:'hidden',borderRadius:'23px 23px 0 0'}}>
                {entryItems.slice(0,3).map(i=>(
                  <img key={i.id} src={i.image||makeThumb(i.name,i.category,i.color)} style={{flex:1,height:'100%',objectFit:'cover'}} alt=""/>
                ))}
                {entryItems.length===0 && <div style={{flex:1,background:'var(--s2)',display:'grid',placeItems:'center',color:'var(--muted)'}}><Star size={28}/></div>}
              </div>
              <div className="item-body">
                <div><h4>{entry.name}</h4><p style={{fontSize:11,color:'var(--muted)'}}>{entry.date} · {entryItems.length} pieces</p></div>
                <button className="trash" onClick={()=>deleteEntry(entry.id)}><Trash2 size={14}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR SCREEN
// ─────────────────────────────────────────────
function CalendarScreen({ calendar, setCalendar, history, items, onBack, notify }) {
  const [cur, setCur] = useState(new Date());
  const [sel, setSel] = useState(null);

  const y = cur.getFullYear(), m = cur.getMonth();
  const monthName = cur.toLocaleString('default', { month:'long', year:'numeric' });
  const firstDay  = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const dayKey = d => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const todayStr = today();

  function assignOutfit(d, entryId) {
    setCalendar(old => ({ ...old, [dayKey(d)]: entryId }));
    notify('Outfit planned ✓');
    setSel(null);
  }

  function clearDay(d) {
    setCalendar(old => { const n={...old}; delete n[dayKey(d)]; return n; });
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="icon-button" onClick={onBack}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
        <h3>Style Calendar</h3>
      </div>
      <div className="glass-panel" style={{padding:20,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button className="icon-button" onClick={()=>setCur(new Date(y,m-1,1))}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
          <h3 style={{fontSize:18}}>{monthName}</h3>
          <button className="icon-button" onClick={()=>setCur(new Date(y,m+1,1))}><ChevronRight size={18}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
            <div key={d} style={{textAlign:'center',fontSize:11,color:'var(--muted)',padding:'4px 0'}}>{d}</div>
          ))}
          {cells.map((d,i) => {
            if (!d) return <div key={i}/>;
            const k = dayKey(d);
            const hasOutfit = !!calendar[k];
            const isToday = k === todayStr;
            return (
              <button key={i} onClick={()=>setSel(sel===d?null:d)} style={{
                background: sel===d ? 'rgba(139,124,246,.3)' : hasOutfit ? 'rgba(85,225,136,.1)' : 'rgba(255,255,255,.04)',
                border: isToday ? '2px solid var(--violet)' : '1px solid var(--line)',
                borderRadius:10, padding:'8px 4px', cursor:'pointer', color: isToday?'var(--violet-2)':'var(--soft)',
                fontWeight: isToday?700:400, fontSize:13, display:'flex',flexDirection:'column',alignItems:'center',gap:3
              }}>
                {d}
                {hasOutfit && <div style={{width:5,height:5,borderRadius:'50%',background:'var(--green)'}}/>}
              </button>
            );
          })}
        </div>
      </div>

      {sel && (
        <div className="glass-panel" style={{padding:20}}>
          <h3 style={{fontSize:16,marginBottom:4}}>Plan outfit for {monthName.split(' ')[0]} {sel}</h3>
          <p style={{color:'var(--muted)',fontSize:13,marginBottom:16}}>Choose a saved look to assign to this day.</p>
          {history.length===0 && <p style={{color:'var(--muted)',fontSize:13}}>No saved looks yet — save outfits from the Stylist first.</p>}
          <div style={{display:'grid',gap:8}}>
            {history.map(entry => {
              const assigned = calendar[dayKey(sel)]===entry.id;
              return (
                <button key={entry.id} onClick={()=>assignOutfit(sel,entry.id)} style={{
                  display:'flex',alignItems:'center',gap:12,padding:10,border:'1px solid var(--line)',
                  borderRadius:14,background:assigned?'rgba(139,124,246,.15)':'rgba(255,255,255,.04)',
                  color:'white',textAlign:'left',cursor:'pointer',
                }}>
                  <div style={{width:42,height:52,borderRadius:10,overflow:'hidden',flexShrink:0,background:'var(--s2)'}}>
                    {items.filter(i=>entry.items.includes(i.id))[0]?.image && (
                      <img src={items.find(i=>entry.items.includes(i.id)).image} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    )}
                  </div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{entry.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{entry.date}</div></div>
                  {assigned && <Check size={18} color="var(--green)"/>}
                </button>
              );
            })}
          </div>
          {calendar[dayKey(sel)] && (
            <button className="button ghost" style={{marginTop:12,color:'var(--rose)',width:'100%'}} onClick={()=>clearDay(sel)}>
              <Trash2 size={14}/> Clear this day
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MOOD BOARD SCREEN
// ─────────────────────────────────────────────
function MoodScreen({ mood, setMood, onBack, notify }) {
  const fileRef = useRef();

  async function addImages(files) {
    const newImgs = [];
    for (const f of Array.from(files)) {
      const url = await fileToDataUrl(f);
      newImgs.push({ id: Date.now()+Math.random(), url, label:'' });
    }
    setMood(old => [...old, ...newImgs]);
    notify(`${newImgs.length} image${newImgs.length>1?'s':''} added to mood board`);
  }

  function removeImg(id) { setMood(old=>old.filter(m=>m.id!==id)); }

  function updateLabel(id, label) { setMood(old=>old.map(m=>m.id===id?{...m,label}:m)); }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="icon-button" onClick={onBack}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
        <h3>Mood Board</h3>
        <button className="button primary" style={{marginLeft:'auto',minHeight:38,padding:'0 14px'}} onClick={()=>fileRef.current.click()}>
          <ImagePlus size={16}/> Add images
        </button>
      </div>
      {mood.length===0 && (
        <div className="glass-panel" style={{padding:64,textAlign:'center'}}>
          <BookOpen size={40} color="#3a3d50" style={{margin:'0 auto 16px'}}/>
          <p style={{color:'var(--muted)',marginBottom:16}}>Pin style inspiration images here to guide your wardrobe decisions.</p>
          <button className="button primary" onClick={()=>fileRef.current.click()}><ImagePlus size={16}/> Add first image</button>
        </div>
      )}
      <div className="wardrobe-grid">
        {mood.map(img=>(
          <div key={img.id} className="glass-panel item-card">
            <div className="item-image-wrap">
              <img src={img.url} alt="inspiration" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              <button className="float-btn fav on" style={{background:'rgba(251,113,133,.25)'}} onClick={()=>removeImg(img.id)}><X size={14}/></button>
            </div>
            <div style={{padding:'8px 12px'}}>
              <input value={img.label} onChange={e=>updateLabel(img.id,e.target.value)}
                placeholder="Add a note…"
                style={{width:'100%',background:'none',border:'none',outline:'none',color:'var(--soft)',fontSize:12}}/>
            </div>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>addImages(e.target.files)}/>
    </div>
  );
}

// ─────────────────────────────────────────────
// PACKING LIST SCREEN
// ─────────────────────────────────────────────
function PackingScreen({ items, packing, setPacking, onBack, notify }) {
  const [dest,   setDest]   = useState('');
  const [days,   setDays]   = useState(5);
  const [type,   setType]   = useState('Smart Casual');
  const [checks, setChecks] = useState({});
  const [active, setActive] = useState(null);

  function generate() {
    if (!dest.trim()) return;
    const capsule = buildCapsule(items, `${days}-day ${type.toLowerCase()} trip to ${dest}`);
    const packItems = capsule.items.map(i=>({ id:i.id, name:i.name, category:i.category, reason: `${type} appropriate, ${i.seasons.includes('All Season')?'versatile':'seasonal'} pick` }));
    // Add duplicates for multi-day essentials
    const essentials = [
      {id:'pack-u'+(Date.now()), name:'Undergarments ×'+days, category:'Essentials', reason:'One per day minimum'},
      {id:'pack-s'+(Date.now()), name:'Socks ×'+days,        category:'Essentials', reason:'One per day minimum'},
    ];
    const entry = { id:Date.now(), dest, days, type, date:today(), items:[...packItems,...essentials], outfitDays:capsule.days };
    setPacking(old=>[entry,...old]);
    setActive(entry.id);
    notify(`Packing list for ${dest} created ✓`);
    setDest(''); setDays(5);
  }

  function deleteList(id) { setPacking(old=>old.filter(p=>p.id!==id)); if(active===id) setActive(null); }

  function toggleCheck(listId, itemId) {
    const k = `${listId}-${itemId}`;
    setChecks(old=>({...old,[k]:!old[k]}));
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="icon-button" onClick={onBack}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
        <h3>Packing List</h3>
      </div>

      {/* Generator */}
      <div className="glass-panel" style={{padding:20,marginBottom:16}}>
        <p className="eyebrow" style={{marginBottom:12}}>New trip</p>
        <div className="form-grid">
          <label>Destination<input value={dest} onChange={e=>setDest(e.target.value)} placeholder="e.g. Paris, Tokyo"/></label>
          <label>Days<input type="number" min={1} max={30} value={days} onChange={e=>setDays(+e.target.value)}/></label>
          <label>Style
            <select value={type} onChange={e=>setType(e.target.value)}>
              {['Casual','Smart Casual','Business Casual','Formal','Beach','Hiking'].map(t=><option key={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <button className="button primary wide" style={{marginTop:14}} onClick={generate} disabled={!dest.trim()||items.length===0}>
          <Luggage size={18}/> Generate packing list
        </button>
        {items.length===0 && <p style={{color:'var(--muted)',fontSize:12,marginTop:8,textAlign:'center'}}>Add items to your wardrobe first.</p>}
      </div>

      {/* Lists */}
      {packing.map(list=>(
        <div key={list.id} className="glass-panel" style={{marginBottom:12,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',cursor:'pointer',borderBottom:'1px solid var(--line)'}}
            onClick={()=>setActive(active===list.id?null:list.id)}>
            <div>
              <div style={{fontWeight:600}}>✈ {list.dest}</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>{list.days} days · {list.type} · {list.date}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:12,color:'var(--muted)'}}>{list.items.filter((_,i2)=>checks[`${list.id}-${list.items[i2]?.id}`]).length}/{list.items.length} packed</span>
              <ChevronRight size={16} color="var(--muted)" style={{transform:active===list.id?'rotate(90deg)':'none',transition:'.2s'}}/>
            </div>
          </div>
          {active===list.id && (
            <div style={{padding:'12px 20px 20px'}}>
              {/* 7-day plan */}
              {list.outfitDays && (
                <div style={{marginBottom:16}}>
                  <p className="eyebrow" style={{marginBottom:8}}>Day-by-day plan</p>
                  <div style={{display:'grid',gap:6}}>
                    {list.outfitDays.slice(0,list.days).map(d=>(
                      <div key={d.day} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(255,255,255,.04)',borderRadius:10,fontSize:13}}>
                        <strong>{d.day}</strong><span style={{color:'var(--muted)'}}>{d.look}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Checklist */}
              <p className="eyebrow" style={{marginBottom:8}}>Packing checklist</p>
              {list.items.map(it=>{
                const k=`${list.id}-${it.id}`;
                return (
                  <div key={it.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:'pointer'}}
                    onClick={()=>toggleCheck(list.id,it.id)}>
                    <div style={{width:22,height:22,borderRadius:6,border:'1px solid var(--line)',background:checks[k]?'var(--violet)':'transparent',display:'grid',placeItems:'center',flexShrink:0,transition:'.15s'}}>
                      {checks[k] && <Check size={14} color="white"/>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,textDecoration:checks[k]?'line-through':'none',color:checks[k]?'var(--muted)':'white'}}>{it.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{it.reason}</div>
                    </div>
                  </div>
                );
              })}
              <button className="button ghost" style={{marginTop:14,color:'var(--rose)',width:'100%'}} onClick={()=>deleteList(list.id)}>
                <Trash2 size={14}/> Delete this list
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAPSULE STUDIO
// ─────────────────────────────────────────────
function CapsuleStudio({ items, onBack }) {
  const [goal, setGoal] = useState('7-day smart casual capsule');
  const capsule = useMemo(() => buildCapsule(items, goal), [items, goal]);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="icon-button" onClick={onBack}><ChevronRight size={18} style={{transform:'rotate(180deg)'}}/></button>
        <h3>Capsule Studio</h3>
      </div>
      <div className="capsule-grid">
        <section className="glass-panel capsule-hero">
          <p className="eyebrow">Smart capsule builder</p>
          <h3>Capsule Studio</h3>
          <p>A focused mini-wardrobe for a week, travel, business meetings, or a new style identity.</p>
          <div className="big-input"><Layers3 size={20}/><input value={goal} onChange={e=>setGoal(e.target.value)}/></div>
        </section>

        <section className="glass-panel capsule-items">
          <div className="section-head">
            <div><p className="eyebrow">Capsule picks</p><h3>{capsule.title}</h3></div>
            <div className="score-badge">{capsule.score}%</div>
          </div>
          <div className="large-outfit-grid">
            {capsule.items.map(i=><OutfitItem key={i.id} item={i}/>)}
          </div>
        </section>

        <section className="glass-panel planner-card">
          <h3>7-day outfit planner</h3>
          <div className="planner-list">
            {capsule.days.map(d=><div key={d.day}><strong>{d.day}</strong><span>{d.look}</span></div>)}
          </div>
        </section>

        <section className="glass-panel feature-roadmap">
          <h3>More features in this app</h3>
          <div className="roadmap-grid">
            {[
              ['Outfit History',   'Save and name looks from the Stylist.'],
              ['Style Calendar',   'Plan your outfit for every day of the month.'],
              ['Mood Board',       'Pin inspiration images to guide your style.'],
              ['Packing Lists',    'AI-built travel checklists from your wardrobe.'],
              ['Colour Palette',   'See your wardrobe colour breakdown visually.'],
              ['Wear Tracker',     'Know your most and least worn pieces instantly.'],
            ].map(([title,desc])=>(
              <div key={title}><Sparkles size={16}/><strong>{title}</strong><p>{desc}</p></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
