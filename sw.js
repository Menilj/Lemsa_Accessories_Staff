const CACHE_NAME = 'lemsa-cache-v1';

// Add assets you want available immediately offline
const PRECACHE_ASSETS = [
  '/Lemsa_Accessories_Staff/',
  '/Lemsa_Accessories_Staff/index.html',
  '/Lemsa_Accessories_Staff/manifest.json'
];


// Install Event: Caches essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // Forces immediate activation
  );
});

// Activate Event: Cleans up old cache assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Takes control of open tabs immediately
  );
});

// Fetch Event: Cache first, network fallback strategy
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests (ignores browser extensions)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch a fresh version in the background to keep cache updated
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* Ignore network failures in background fetch */ });

        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone and save new valid requests to the cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback placeholder if network fails and item isn't cached
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
