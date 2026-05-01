# Wardrobe OS v2

A fully offline, local-first personal wardrobe app built with React + Vite.

## What's new in v2

- **No framer-motion** — removed external animation dependency. CSS animations only. `npm install` is faster and lighter.
- **Outfit History** — save and name looks from the Stylist. Browse all past outfits.
- **Style Calendar** — plan what to wear on specific days. Assign saved looks to any date.
- **Mood Board** — upload inspiration images with notes to guide your wardrobe decisions.
- **Packing List** — AI-powered travel capsule builder with day-by-day outfit plans and a packing checklist.
- **Colour Palette Analyser** — visual breakdown of your wardrobe's dominant colours.
- **Wear Tracker** — most worn and never-worn items highlighted in the Auditor.
- **Better Judge** — score colours change to green/amber/red based on value.
- **Log wear from modal** — tap +1 Wear directly inside any item's edit screen.
- **Search** — search by name, colour, occasion, or category.
- **Multi-select** — select multiple items to bulk-delete or log wear.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown by Vite. Works fully offline after first load.

## Build for production

```bash
npm run build
npm run preview
```

## Files

```
wardrobe-os/
  package.json        ← no framer-motion
  index.html
  src/
    main.jsx
    App.jsx           ← all logic, screens, algorithms
    styles.css        ← original design + v2 additions
```

## Storage keys

All data is stored in localStorage:
- `wardrobe-os-v2`       — wardrobe items
- `wardrobe-os-history`  — saved outfit looks
- `wardrobe-os-calendar` — day → outfit assignments
- `wardrobe-os-mood`     — mood board images
- `wardrobe-os-packing`  — packing lists

## Next upgrades

- Real AI vision tagging via OpenRouter (no Claude subscription needed)
- Weather-aware outfit recommendations
- PWA install mode (offline-first)
- Export/import wardrobe as JSON
- Outfit selfie judge (camera capture)
- Supabase sync for multi-device
