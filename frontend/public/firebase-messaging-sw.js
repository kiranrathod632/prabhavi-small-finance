/* Firebase Cloud Messaging service worker — mobile + web push */
/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let messagingStarted = false;

const startMessaging = (config) => {
  if (messagingStarted || !config?.apiKey || !config?.projectId) return;
  try {
    // Trim in case config was passed with accidental whitespace
    const clean = Object.fromEntries(
      Object.entries(config).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    firebase.initializeApp(clean);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      // If FCM already includes a notification payload, the browser may auto-display it.
      // Only show manually for data-only messages to avoid duplicate OS notifications.
      if (payload?.notification?.title || payload?.notification?.body) {
        return;
      }

      const title = payload?.data?.title || 'Prabhavi Small Finance';
      const options = {
        body: payload?.data?.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload?.data || {},
      };
      self.registration.showNotification(title, options);
    });
    messagingStarted = true;
  } catch (e) {
    console.warn('[sw] FCM init failed', e);
  }
};

// Allow app to pass Firebase web config after SW registration
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    startMessaging(event.data.config);
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Ask any open client to re-send Firebase config after SW activate/update
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clientsList.forEach((client) => {
        client.postMessage({ type: 'REQUEST_FIREBASE_CONFIG' });
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
      return undefined;
    })
  );
});
