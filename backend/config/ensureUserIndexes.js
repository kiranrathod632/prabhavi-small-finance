import User from '../models/User.js';

const LEGACY_USER_INDEXES = ['phone_1', 'mobile_1', 'referralCode_1'];

// Keep users collection index state aligned with current schema.
export const ensureUserIndexes = async () => {
  const existing = await User.collection.indexes();

  for (const name of LEGACY_USER_INDEXES) {
    if (existing.some((idx) => idx.name === name)) {
      try {
        await User.collection.dropIndex(name);
      } catch {
        // Ignore index drop race/errors; syncIndexes below reconciles state.
      }
    }
  }

  await User.syncIndexes();
};

