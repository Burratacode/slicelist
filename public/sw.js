// Slicelist Service Worker
const CACHE_NAME = 'slicelist-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/'])
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy: try network, fall back to cache
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})
