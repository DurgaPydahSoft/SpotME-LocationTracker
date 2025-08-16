// Service Worker for SPOT ME Location Tracker
// This helps maintain background tracking functionality

const CACHE_NAME = 'spot-me-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/src/App.jsx',
  '/src/user/UserDashboard.jsx',
  '/src/admin/AdminDashboard.jsx'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Background sync for location updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-location-sync') {
    event.waitUntil(
      // Handle background location sync
      console.log('Background location sync triggered')
    )
  }
})

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body || 'Location tracking update',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'location-update'
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SPOT ME', options)
    )
  }
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})

// Keep service worker alive
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
