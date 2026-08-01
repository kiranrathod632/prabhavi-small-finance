import api from './api';
import {
  getFirebaseMessaging,
  getToken,
  onMessage,
  isFirebaseConfigured,
} from './firebase';

const TOKEN_KEY = 'fcmToken';

const firebaseWebConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const detectPlatform = () => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'web';
};

/**
 * Request permission, get FCM token, save to backend (mobile + web)
 */
export const registerPushNotifications = async () => {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    registration.active?.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseWebConfig(),
    });

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    localStorage.setItem(TOKEN_KEY, token);
    await api.post('/auth/fcm-token', {
      token,
      platform: detectPlatform(),
    });

    await onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || 'Notification';
      const body = payload?.notification?.body || '';
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo.png',
          data: payload?.data || {},
        });
      }
    });

    return token;
  } catch (error) {
    console.warn('[push] registration skipped:', error?.message || error);
    return null;
  }
};

/**
 * Remove token from backend on logout
 */
export const unregisterPushNotifications = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await api.delete('/auth/fcm-token', { data: { token } });
  } catch {
    // ignore
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
};
