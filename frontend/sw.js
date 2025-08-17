// sw.js (Service Worker)
const CACHE_NAME = 'dsa-platform-v1';
const urlsToCache = [
    '/',
    '/css/main.css',
    '/css/components.css',
    '/css/animation.css',
    '/css/responsive.css',
    '/js/main.js',
    '/js/components.js',
    '/js/animation.js',
    '/js/responsive.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Don't cache API calls
                    if (!event.request.url.includes('/api/') &&
                        !event.request.url.includes('dsa-backend-gj8n.onrender.com')) {
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }

                    return response;
                });
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline support
self.addEventListener('sync', event => {
    if (event.tag === 'sync-progress') {
        event.waitUntil(syncProgress());
    }
});

async function syncProgress() {
    // Sync any offline progress when back online
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.match('pending-progress');

    if (pendingRequests) {
        const pending = await pendingRequests.json();

        for (const request of pending) {
            try {
                await fetch(request.url, request.options);
            } catch (error) {
                console.error('Failed to sync:', error);
            }
        }

        // Clear pending requests
        await cache.delete('pending-progress');
    }
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('DSA Learning Platform', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});