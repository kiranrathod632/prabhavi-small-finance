import InterestSettings from '../models/InterestSettings.js';

let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get active interest/settings (singleton)
 */
export const getSettings = async () => {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  let settings = await InterestSettings.findOne({ isActive: true });
  if (!settings) {
    settings = await InterestSettings.create({});
  }

  cachedSettings = settings;
  cacheTime = now;
  return settings;
};

/**
 * Clear settings cache after update
 */
export const clearSettingsCache = () => {
  cachedSettings = null;
  cacheTime = 0;
};

/**
 * Get interest rate for loan type
 */
export const getInterestRateForLoanType = async (loanType) => {
  const settings = await getSettings();
  return settings.loanTypeRates?.[loanType] || settings.defaultInterestRate || 18;
};
