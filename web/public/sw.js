const CACHE = 'verikey-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/']).then(() => self.skipWaiting()))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Network-first for API routes, verify pages, and cross-origin requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/verify/') || url.origin !== self.location.origin) {
    e.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets
  if (request.destination === 'script' || request.destination === 'style' ||
      request.destination === 'image' || request.destination === 'font') {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
