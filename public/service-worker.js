const CACHE_NAME = 'dropconnect-v8';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/theme.css',
  '/theme.js',
  '/navbar.js',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Do not cache API routes, socket.io, or authentication routes
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/socket.io/') ||
      event.request.url.includes('/auth/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      }).catch(() => {
        // Fallback for offline usage
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});
