const CACHE_NAME = 'CodeShield-Package-Cache-v1';

// Intercept WebContainer package fetching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Focus on package tarballs from npm registry or WebContainer proxies
  if (url.hostname.includes('registry.npmjs.org') || url.pathname.includes('/-/binary/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          // Cache the response for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});

// 🛡️ SECURITY BRIDGE: Immediately take control of all tabs for WebContainer isolation
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});
