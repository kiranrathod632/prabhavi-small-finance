import admin from 'firebase-admin';
import User from '../models/User.js';

let initialized = false;

const initFirebaseAdmin = () => {
  if (initialized) return admin.apps.length > 0;
  initialized = true;

  try {
    if (admin.apps.length > 0) return true;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const jsonCreds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (jsonCreds) {
      const creds = JSON.parse(jsonCreds);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
      return true;
    }

    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return true;
    }

    console.warn('[push] Firebase Admin not configured — push notifications disabled');
    return false;
  } catch (error) {
    console.error('[push] Firebase init failed:', error.message);
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
          Object.entries({ ...data, link: link || data.link || '' }).map(([k, v]) => [
            k,
            v == null ? '' : String(v),
          ])
        ),
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
