declare const self: ServiceWorkerGlobalScope;

// Satisfy VitePWA injectManifest requirement by referencing the manifest variable
const manifest = self.__WB_MANIFEST || [];
console.log('Service Worker loaded with precache manifest items:', manifest.length);

// Force active service worker to take control immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification events
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, icon, data } = payload;

    event.waitUntil(
      self.registration.showNotification(title || 'TraxEco System', {
        body: body || '',
        icon: icon || '/logo.png',
        badge: '/logo.png',
        data: data || { url: '/' }
      })
    );
  } catch (err) {
    try {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('TraxEco System', {
          body: text,
          icon: '/logo.png',
          badge: '/logo.png',
          data: { url: '/' }
        })
      );
    } catch (e) {
      console.error('Failed to show push notification', e);
    }
  }
});

// Handle clicking on the notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open on this app, focus it
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
