const CACHE_NAME = 'nubcal-cache-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => {
        console.warn('Cache addAll warning:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache external API calls or sensitive endpoints
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests fall back to cached index.html when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Static assets: Stale-while-revalidate / Cache-first with network populate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// Handle notification click: Focus active window or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If window already exists, focus it
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open the app at current scope
        if (self.clients.openWindow) {
          return self.clients.openWindow(self.registration.scope || '/');
        }
      })
  );
});

// Handle incoming messages to trigger notification from SW registration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const iconUrl = new URL('icon.svg', self.registration.scope).href;
    self.registration.showNotification(title || 'nub: บันทึกอาหาร', {
      icon: iconUrl,
      badge: iconUrl,
      vibrate: [200, 100, 200],
      tag: options?.tag || 'nub-food-reminder',
      renotify: true,
      ...options,
    });
  }
});
