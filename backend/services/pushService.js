import admin from 'firebase-admin';
import User from '../models/User.js';

let initialized = false;

const cleanEnv = (value) => (typeof value === 'string' ? value.trim() : value);

const normalizePrivateKey = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let key = raw.trim();
  // Accidental JSON trailing comma / wrapping quotes from .env paste
  while (key.endsWith(',')) key = key.slice(0, -1).trim();
  if (
    (key.startsWith('"') && key.endsWith('"'))
    || (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n').trim();
};

const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    initialized = true;
    return true;
  }
  if (initialized) return false;

  try {
    const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    const jsonCreds = cleanEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    if (jsonCreds) {
      const creds = JSON.parse(jsonCreds);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
      initialized = true;
      return true;
    }

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      initialized = true;
      return true;
    }

    initialized = true;
    console.warn('[push] Firebase Admin not configured — push notifications disabled');
    return false;
  } catch (error) {
    console.error('[push] Firebase init failed:', error.message);
    // Allow retry on next send if credentials were temporarily bad
    initialized = false;
    return false;
  }
};

/**
 * Send FCM push to a user's registered mobile/web tokens
 */
export const sendPushToUser = async (userId, { title, body, data = {}, link } = {}) => {
  if (!userId || !title) return { sent: 0, skipped: true };

  if (!initFirebaseAdmin()) {
    return { sent: 0, skipped: true, reason: 'not_configured' };
  }

  try {
    const user = await User.findById(userId).select('+fcmTokens');
    const tokens = (user?.fcmTokens || []).map((t) => t.token).filter(Boolean);
    if (!tokens.length) return { sent: 0, skipped: true, reason: 'no_tokens' };

    const payload = {
      notification: {
        title,
        body: body || '',
      },
      data: {
        ...Object.fromEntries(
          Object.entries({
            ...data,
            title,
            body: body || '',
            link: link || data.link || '',
          }).map(([k, v]) => [k, v == null ? '' : String(v)])
        ),
      },
      webpush: {
        fcmOptions: {
          link: link || data.link || '/',
        },
        notification: {
          title,
          body: body || '',
          icon: '/logo.png',
        },
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code || '';
        if (
          code.includes('registration-token-not-registered')
          || code.includes('invalid-registration-token')
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
      );
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('[push] send failed:', error.message);
    return { sent: 0, error: error.message };
  }
};

/**
 * Register / refresh an FCM token for a user
 */
export const registerFcmToken = async (userId, token, platform = 'web') => {
  if (!userId || !token) return null;
  const user = await User.findById(userId).select('+fcmTokens');
  if (!user) return null;

  const existing = (user.fcmTokens || []).find((t) => t.token === token);
  if (existing) {
    existing.updatedAt = new Date();
    existing.platform = platform || existing.platform || 'web';
  } else {
    user.fcmTokens = user.fcmTokens || [];
    user.fcmTokens.push({ token, platform: platform || 'web', updatedAt: new Date() });
    // Keep last 10 tokens per user
    if (user.fcmTokens.length > 10) {
      user.fcmTokens = user.fcmTokens.slice(-10);
    }
  }
  await user.save();
  return true;
};

/**
 * Remove an FCM token
 */
export const unregisterFcmToken = async (userId, token) => {
  if (!userId || !token) return null;
  await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });
  return true;
};
