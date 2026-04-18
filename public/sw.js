// Slicelist Service Worker v3
// Strategy: cache-first for static assets only.
// API routes, dynamic pages, and Supabase data always go to network.
const CACHE_NAME = 'slicelist-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Delete all old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)

  // ── Never intercept these — always go straight to network ──
  // API routes (Google Maps proxy, Supabase, etc.)
  if (url.pathname.startsWith('/api/')) return
  // Next.js data fetching
  if (url.pathname.startsWith('/_next/data/')) return
  // Auth callbacks
  if (url.pathname.startsWith('/auth/')) return

  // ── Static assets: cache-first (JS/CSS bundles have hashed filenames) ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // ── Icons / manifest: cache-first ──
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // ── Everything else (page navigations): network-first, cache as offline fallback ──
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request))
  )
})
