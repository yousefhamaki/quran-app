// App-shell + data cache so the app opens without internet.
// - Network first, falling back to the cache (so updates show up as soon as you are online).
// - Audio from everyayah.com is NOT handled here: downloaded surahs are stored by the app itself.
// - Google Fonts answer with "opaque" cross-origin responses; those are cached too so Arabic text
//   keeps its typeface offline.
const CACHE = 'quran-v2';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/icon.svg', '/manifest.webmanifest'])));
});

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('quran-v') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  ));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('everyayah.com')) return;

  const isFont = FONT_HOSTS.includes(url.hostname);
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok || (isFont && res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        // Single-page app: any page navigation falls back to the cached shell.
        if (req.mode === 'navigate') return (await caches.match('/')) ?? Response.error();
        return Response.error();
      }),
  );
});
