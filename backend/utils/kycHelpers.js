import User from '../models/User.js';

/** KYC complete when Aadhaar, PAN, and bank photos are uploaded */
export const hasRequiredKycDocuments = (profile) =>
  Boolean(profile?.aadhaarDocument && profile?.panDocument && profile?.bankDocument);

export const syncUserKycCompleted = async (userId, profile) => {
  const kycCompleted = hasRequiredKycDocuments(profile);
  await User.findByIdAndUpdate(userId, { kycCompleted });
  return kycCompleted;
};
