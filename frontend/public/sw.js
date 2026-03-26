const CACHE_NAME = 'wheelca-v1';
const TILE_CACHE = 'wheelca-tiles-v1';

const APP_SHELL = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tile requests — cache first (CARTO tiles)
  if (url.hostname.includes('basemaps.cartocdn.com')) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // API requests — network first, fall back to cache
  if (url.pathname.startsWith('/api/') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Pre-cache tiles
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_TILES') {
    const { tiles } = event.data;
    event.waitUntil(
      caches.open(TILE_CACHE).then(async (cache) => {
        let done = 0;
        const total = tiles.length;
        for (const url of tiles) {
          try {
            const existing = await cache.match(url);
            if (!existing) {
              const response = await fetch(url);
              if (response.ok) await cache.put(url, response);
            }
          } catch (e) { /* skip */ }
          done++;
          if (done % 50 === 0 || done === total) {
            self.clients.matchAll().then(clients => {
              clients.forEach(c => c.postMessage({ type: 'CACHE_PROGRESS', done, total }));
            });
          }
        }
        self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage({ type: 'CACHE_COMPLETE', total }));
        });
      })
    );
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    Promise.all([
      caches.open(TILE_CACHE).then(c => c.keys()).then(k => k.length),
      caches.open(CACHE_NAME).then(c => c.keys()).then(k => k.length),
    ]).then(([tiles, app]) => {
      event.source.postMessage({ type: 'CACHE_SIZE', tiles, app });
    });
  }

  if (event.data.type === 'CLEAR_TILE_CACHE') {
    caches.delete(TILE_CACHE).then(() => {
      event.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});
