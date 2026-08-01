// RCS Canteen Service Worker
// Version: v1.1.0-r7
// Strategy: Cache-first for static assets, network-first for API calls,
//           stale-while-revalidate for navigations.

const CACHE_VERSION = 'rcs-canteen-v1.1.0-r7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE_NAME = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  OFFLINE_URL,
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))
        )
      )
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Don't fail install if offline.html is missing — just log
        console.warn('[SW] Precache failed:', err.message);
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: is this a navigation request?
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  );
}

// Helper: is this an API call?
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Helper: is this a static asset?
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/apple-touch') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/robots.txt'
  );
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR + dev endpoints
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('__nextjs_original-stack-frame') ||
    url.pathname.startsWith('/_next/image')
  ) {
    return;
  }

  // 1. Navigation requests — network-first, fall back to cache, then offline page
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        })
    );
    return;
  }

  // 2. API requests — network-first, no caching (data must be fresh)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a minimal JSON error for API failures
        return new Response(
          JSON.stringify({
            error: 'You appear to be offline. Please check your connection.',
            offline: true,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. Static assets — cache-first, then network (and cache the response)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Everything else — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Listen for messages from the page (e.g., manual cache clear)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    );
  }
});
