const CACHE_NAME = 'myt-crm-v2';

// Install event - cache shell resources
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

// Handle push events (background notifications)
self.addEventListener('push', (event) => {
    let data = { title: 'M&T CRM', body: 'Tienes una nueva notificación' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body || '',
        icon: '/logo-icon.jpg',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'crm-notification',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: self.location.origin },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'M&T CRM', options)
    );
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus existing window if open
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new window
            return self.clients.openWindow('/');
        })
    );
});

// Handle messages from the app (for showing notifications via SW)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data;
        self.registration.showNotification(title, {
            body,
            icon: '/logo-icon.jpg',
            badge: '/icons/icon-192.png',
            tag: tag || 'crm-notification',
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: self.location.origin },
        });
    }
});
