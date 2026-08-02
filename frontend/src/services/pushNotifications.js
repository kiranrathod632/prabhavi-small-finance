import api from './api';
import {
  getFirebaseMessaging,
  getFirebaseWebConfig,
  getFirebaseVapidKey,
  getToken,
  onMessage,
  isFirebaseConfigured,
} from './firebase';

const TOKEN_KEY = 'fcmToken';

let registering = null;
let foregroundUnsub = null;
let lastRegisteredToken = null;
let swConfigListenerAttached = false;

const ensureSwConfigListener = () => {
  if (swConfigListenerAttached || typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  swConfigListenerAttached = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'REQUEST_FIREBASE_CONFIG') return;
    if (!isFirebaseConfigured()) return;
    const config = getFirebaseWebConfig();
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FIREBASE_CONFIG',
        config,
      });
    }
  });
};

const detectPlatform = () => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'web';
};

const waitForActiveWorker = async (registration) => {
  if (registration.active) return registration.active;

  const worker = registration.installing || registration.waiting;
  if (!worker) {
    await navigator.serviceWorker.ready;
    return registration.active;
  }

  if (worker.state === 'activated') return registration.active;

  await new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
    });
  });

  return registration.active;
};

const postConfigToServiceWorker = async (registration, config) => {
  const active = await waitForActiveWorker(registration);
  if (active) {
    active.postMessage({ type: 'FIREBASE_CONFIG', config });
  }

  // Also notify controlling SW (handles update / claim races)
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'FIREBASE_CONFIG',
      config,
    });
  }
};

/**
 * Request permission, get FCM token, save to backend (mobile + web)
 */
export const registerPushNotifications = async () => {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (!('serviceWorker' in navigator)) return null;

  // Deduplicate concurrent / repeated registration calls
  if (registering) return registering;
  ensureSwConfigListener();

  registering = (async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;

      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;

      const config = getFirebaseWebConfig();
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      await postConfigToServiceWorker(registration, config);

      const token = await getToken(messaging, {
        vapidKey: getFirebaseVapidKey(),
        serviceWorkerRegistration: registration,
      });

      if (!token) return null;

      // Re-save when token rotates or first register
      if (token !== lastRegisteredToken) {
        localStorage.setItem(TOKEN_KEY, token);
        await api.post('/auth/fcm-token', {
          token,
          platform: detectPlatform(),
        });
        lastRegisteredToken = token;
      }

      // Attach foreground listener once
      if (!foregroundUnsub) {
        foregroundUnsub = await onMessage(messaging, (payload) => {
          const title = payload?.notification?.title || payload?.data?.title || 'Notification';
          const body = payload?.notification?.body || payload?.data?.body || '';
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/logo.png',
              data: payload?.data || {},
            });
          }
        });
      }

      return token;
    } catch (error) {
      console.warn('[push] registration skipped:', error?.message || error);
      return null;
    } finally {
      registering = null;
    }
  })();

  return registering;
};

/**
 * Remove token from backend on logout
 */
export const unregisterPushNotifications = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  lastRegisteredToken = null;
  if (typeof foregroundUnsub === 'function') {
    try {
      foregroundUnsub();
    } catch {
      // ignore
    }
    foregroundUnsub = null;
  }
  if (!token) return;
  try {
    await api.delete('/auth/fcm-token', { data: { token } });
  } catch {
    // ignore
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
};
