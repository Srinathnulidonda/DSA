// Service Worker for DSA Learning Dashboard

const CACHE_NAME = 'dsa-learning-v1';
const urlsToCache = [
    '/',
    '/dashboard.html',
    '/roadmap.html',
    '/progress.html',
    '/calendar.html',
    '/notes.html',
    '/pomodoro.html',
    '/profile.html',
    '/analytics.html',
    '/css/styles.css',
    '/css/mobile.css',
    '/js/utils.js',
    '/js/app.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/roadmap.js',
    '/js/calendar.js',
    '/js/progress.js',
    '/js/notes.js',
    '/js/pomodoro.js',
    '/js/profile.js',
    '/js/analytics.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Cache and return requests
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
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Update Service Worker
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

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'sync-progress') {
        event.waitUntil(syncProgress());
    }
});

async function syncProgress() {
    try {
        const offlineData = await getOfflineData();
        if (offlineData && offlineData.length > 0) {
            // Send offline data to server
            for (const data of offlineData) {
                await fetch(data.url, {
                    method: data.method,
                    headers: data.headers,
                    body: JSON.stringify(data.body)
                });
            }
            // Clear offline data after successful sync
            await clearOfflineData();
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'You have a new notification!',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View',
                icon: '/assets/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('DSA Learning', options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        clients.openWindow('/dashboard.html');
    }
});

// Helper functions
async function getOfflineData() {
    // This would retrieve offline data from IndexedDB
    return [];
}

async function clearOfflineData() {
    // This would clear offline data from IndexedDB
}