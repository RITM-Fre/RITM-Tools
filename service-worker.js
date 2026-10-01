// Cache-first service worker: the app works offline after the first load.
// Bump CACHE when you change files so users get the update.
const CACHE = 'ritm-v1';
const ASSETS = ['./', 'index.html', 'style.css', 'script.js', 'tools/registry.js', 'i18n/fa.json', 'i18n/en.json', 'manifest.json'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k != CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method != 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('index.html'))));
});
