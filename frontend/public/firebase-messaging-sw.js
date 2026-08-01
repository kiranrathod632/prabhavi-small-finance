/* Firebase Cloud Messaging service worker — mobile + web push */
/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let messagingStarted = false;

const startMessaging = (config) => {
  if (messagingStarted || !config?.apiKey || !config?.projectId) return;
  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || 'Prabhavi Small Finance';
      const options = {
        body: payload?.notification?.body || '',
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
      return undefined;
    })
  );
});
