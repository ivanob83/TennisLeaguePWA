// Tennis League PWA — Service Worker
// Caches the app shell for offline use.

const CACHE_NAME = 'tennis-league-v1'

// App shell assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') return

  // Network-first for API / Firestore calls
  const url = new URL(request.url)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // Cache-first for static assets, network-first + cache fallback for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then(r => r || fetch(request))
      )
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const toCache = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache))
        return response
      })
    })
  )
})
