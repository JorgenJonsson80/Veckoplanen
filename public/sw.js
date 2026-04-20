// Service Worker för Veckoplanen – cache-first för app-skalet
const CACHE = 'veckoplanen-__BUILD__';

// Filer som alltid ska cachas vid installation
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Rensa gamla cache-versioner
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Supabase-anrop och externa resurser – gå alltid till nätverket
  if (!url.origin.includes(self.location.origin) || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // App-skal: cache-first, sedan nätverk
  e.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
