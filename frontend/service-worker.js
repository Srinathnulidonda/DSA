// Service Worker for offline functionality
const CACHE_NAME = 'dsa-dashboard-v1.1';
const API_CACHE_NAME = 'dsa-api-cache-v1';
const IMAGE_CACHE_NAME = 'dsa-image-cache-v1';

// Files to cache for offline use
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/components.css',
    '/css/responsive.css',
    '/css/animations.css',
    '/css/themes/light-theme.css',
    '/css/themes/dark-theme.css',
    '/js/main.js',
    '/js/api.js',
    '/js/utils.js',
    '/js/progress.js',
    '/js/timetable.js',
    '/js/notes.js',
    '/js/projects.js',
    '/js/resources.js',
    '/config/settings.js',
    // External dependencies
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    // JSON data files
    '/timetable/roadmap.json',
    '/resources/dsa_resources.json',
    '/resources/practice_links.json',
    '/resources/glossary.json'
];

// Week data files
for (let i = 1; i <= 14; i++) {
    urlsToCache.push(`/timetable/week-${i.toString().padStart(2, '0')}.json`);
}

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME];

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.origin === 'http://apibackend') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle image requests
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
        return;
    }

    // Handle app resources
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request).then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (request.destination === 'document') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Try to return cached response
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return error response
        return new Response(JSON.stringify({
            error: 'Network error',
            message: 'Unable to fetch data. Please check your connection.'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE_NAME);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Return placeholder image
        return caches.match('/assets/images/placeholder.png');
    }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-user-data') {
        event.waitUntil(syncUserData());
    }
});

async function syncUserData() {
    try {
        // Get all pending sync requests from IndexedDB
        const syncRequests = await getSyncRequests();

        for (const request of syncRequests) {
            try {
                const response = await fetch(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: request.body
                });

                if (response.ok) {
                    // Remove successful sync request
                    await removeSyncRequest(request.id);
                }
            } catch (error) {
                console.error('Sync failed for request:', request.id);
            }
        }

        // Notify clients about sync completion
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'sync-complete',
                    message: 'Data synchronized successfully'
                });
            });
        });
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New notification from DSA Dashboard',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open Dashboard',
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
        self.registration.showNotification('DSA Dashboard', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper functions for IndexedDB operations
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('DSADashboard', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('syncRequests')) {
                db.createObjectStore('syncRequests', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function getSyncRequests() {
    const db = await openDatabase();
    const transaction = db.transaction(['syncRequests'], 'readonly');
    const store = transaction.objectStore('syncRequests');

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeSyncRequest(id) {
    const db = await openDatabase();
    const transaction = db.transaction(['syncRequests'], 'readwrite');
    const store = transaction.objectStore('syncRequests');

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Cache management utilities
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }

    if (event.data.type === 'CACHE_SIZE') {
        event.waitUntil(
            calculateCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            })
        );
    }
});

async function calculateCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }

    return totalSize;
}