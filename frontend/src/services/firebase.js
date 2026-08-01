/**
 * Firebase web SDK loader (optional).
 * Dynamic string imports — app runs even if `firebase` npm package is missing.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () =>
  Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId
    && firebaseConfig.appId
    && import.meta.env.VITE_FIREBASE_VAPID_KEY
  );

let appInstance = null;
let messagingFns = null;

const loadFirebase = async () => {
  if (messagingFns) return messagingFns;
  try {
    const appPath = ['firebase', 'app'].join('/');
    const msgPath = ['firebase', 'messaging'].join('/');
    const appMod = await import(/* @vite-ignore */ appPath);
    const msgMod = await import(/* @vite-ignore */ msgPath);
    messagingFns = {
      initializeApp: appMod.initializeApp,
      getApps: appMod.getApps,
      getMessaging: msgMod.getMessaging,
      getToken: msgMod.getToken,
      isSupported: msgMod.isSupported,
      onMessage: msgMod.onMessage,
    };
    return messagingFns;
  } catch (error) {
    console.warn('[firebase] SDK not available. Run: npm install firebase');
    return null;
  }
};

export const getFirebaseApp = async () => {
  if (!isFirebaseConfigured()) return null;
  const fb = await loadFirebase();
  if (!fb) return null;
  if (appInstance) return appInstance;
  if (fb.getApps().length) {
    appInstance = fb.getApps()[0];
  } else {
    appInstance = fb.initializeApp(firebaseConfig);
  }
  return appInstance;
};

export const getFirebaseMessaging = async () => {
  if (!isFirebaseConfigured()) return null;
  const fb = await loadFirebase();
  if (!fb) return null;
  const supported = await fb.isSupported().catch(() => false);
  if (!supported) return null;
  const app = await getFirebaseApp();
  if (!app) return null;
  return fb.getMessaging(app);
};

export const getToken = async (...args) => {
  const fb = await loadFirebase();
  if (!fb) return null;
  return fb.getToken(...args);
};

export const onMessage = async (messaging, callback) => {
  const fb = await loadFirebase();
  if (!fb) return () => {};
  return fb.onMessage(messaging, callback);
};
