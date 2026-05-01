const CACHE_NAME = 'starlet-v1';
const ASSETS = [
  '/wardrobe-os/',
  '/wardrobe-os/index.html',
  '/wardrobe-os/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
