const CACHE_NAME = 'dropconnect-v35';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/sender',
  '/sender.html',
  '/receiver',
  '/receiver.html',
  '/login',
  '/login.html',
  '/premium',
  '/premium.html',
  '/settings',
  '/settings.html',
  '/feedback',
  '/feedback.html',
  '/terms',
  '/terms.html',
  '/privacy',
  '/privacy.html',
  '/refund',
  '/refund.html',
  '/theme.css',
  '/theme.js',
  '/navbar.js',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/supabase-config.js',
  '/crypto-js.min.js',
  '/qrcode.min.js',
  '/supabase-js.js',
  '/html5-qrcode.min.js',
  '/vanilla-tilt.min.js'
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
  // Exclude API, auth, socket.io endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/socket.io/') ||
      event.request.url.includes('/auth/')) {
    return;
  }

  // Network-first strategy for page navigations to guarantee correct page loading
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network is offline, match exact request or .html fallback
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          try {
            const url = new URL(event.request.url);
            const htmlMatch = await caches.match(url.pathname + '.html');
            if (htmlMatch) return htmlMatch;
          } catch(e) {}

          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Cache-first for static assets (images, css, js)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
