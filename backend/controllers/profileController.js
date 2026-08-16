import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';
import { syncUserKycCompleted } from '../utils/kycHelpers.js';

const DOC_TYPES = {
  pan: 'panDocument',
  aadhaar: 'aadhaarDocument',
  bank: 'bankDocument',
};

/**
 * Map flat frontend fields into Profile schema shape.
 */
const buildProfileUpdates = (body) => {
  const updates = {};

  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.alternatePhone !== undefined) updates.alternatePhone = body.alternatePhone;
  if (body.pan !== undefined) updates.pan = body.pan;
  if (body.aadhaar !== undefined) updates.aadhaar = body.aadhaar;
  if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;

  const hasAddress =
    body.address !== undefined ||
    body.city !== undefined ||
    body.state !== undefined ||
    body.pincode !== undefined;

  if (hasAddress) {
    updates.address = {};
    if (body.address !== undefined) {
      updates.address.street = typeof body.address === 'string' ? body.address : body.address?.street;
    }
    if (body.city !== undefined) updates.address.city = body.city;
    if (body.state !== undefined) updates.address.state = body.state;
    if (body.pincode !== undefined) updates.address.pincode = body.pincode;
    if (body.address && typeof body.address === 'object') {
      Object.assign(updates.address, body.address);
    }
  }

  const hasBank =
    body.bankName !== undefined ||
    body.accountNumber !== undefined ||
    body.ifscCode !== undefined ||
    body.accountHolderName !== undefined ||
    body.bankDetails !== undefined;

  if (hasBank) {
    updates.bankDetails = {};
    if (body.bankName !== undefined) updates.bankDetails.bankName = body.bankName;
    if (body.accountNumber !== undefined) updates.bankDetails.accountNumber = body.accountNumber;
    if (body.ifscCode !== undefined) updates.bankDetails.ifscCode = body.ifscCode;
    if (body.accountHolderName !== undefined) updates.bankDetails.accountHolderName = body.accountHolderName;
    if (body.bankDetails && typeof body.bankDetails === 'object') {
      Object.assign(updates.bankDetails, body.bankDetails);
    }
  }

  return updates;
};

/**
 * @route   GET /api/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  sendResponse(res, 200, 'Profile fetched', {
    user: req.user,
    profile,
    kycCompleted: !!req.user.kycCompleted,
  });
});

/**
 * @route   PUT /api/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const updates = buildProfileUpdates(req.body);

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    profile = new Profile({ user: req.user._id });
  }

  if (updates.phone !== undefined) profile.phone = updates.phone;
  if (updates.alternatePhone !== undefined) profile.alternatePhone = updates.alternatePhone;
  if (updates.pan !== undefined) profile.pan = updates.pan;
  if (updates.aadhaar !== undefined) profile.aadhaar = updates.aadhaar;
  if (updates.dateOfBirth !== undefined) profile.dateOfBirth = updates.dateOfBirth;

  if (updates.address) {
    profile.address = { ...(profile.address?.toObject?.() || profile.address || {}), ...updates.address };
  }
  if (updates.bankDetails) {
    profile.bankDetails = {
      ...(profile.bankDetails?.toObject?.() || profile.bankDetails || {}),
      ...updates.bankDetails,
    };
  }

  await profile.save();

  const kycCompleted = await syncUserKycCompleted(req.user._id, profile);

  // Update user name fields if provided
  const userUpdates = {};
  if (req.body.firstName !== undefined) userUpdates.firstName = req.body.firstName?.trim() || '';
  if (req.body.middleName !== undefined) userUpdates.middleName = req.body.middleName?.trim() || '';
  if (req.body.lastName !== undefined) userUpdates.lastName = req.body.lastName?.trim() || '';
  if (req.body.name) userUpdates.name = req.body.name;
  if (req.body.preferredLanguage) userUpdates.preferredLanguage = req.body.preferredLanguage;

  if (
    userUpdates.firstName !== undefined ||
    userUpdates.middleName !== undefined ||
    userUpdates.lastName !== undefined
  ) {
    const user = await User.findById(req.user._id);
    const composed = [userUpdates.firstName ?? user?.firstName, userUpdates.middleName ?? user?.middleName, userUpdates.lastName ?? user?.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');
    if (composed) userUpdates.name = composed;
  }

  if (Object.keys(userUpdates).length) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  await createAuditLog({
    user: req.user._id,
    action: 'Profile updated',
    entity: 'profile',
    entityId: profile._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Profile updated', { ...profile.toObject(), kycCompleted });
});

/**
 * @route   POST /api/profile/avatar
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded');

  const avatarUrl = `/uploads/profiles/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { profilePicture: avatarUrl },
    { new: true, upsert: true }
  );

  sendResponse(res, 200, 'Avatar uploaded', { avatar: avatarUrl, profile });
});

/**
 * @route   POST /api/profile/documents
 * body.type: pan | aadhaar | bank
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded');

  const { type } = req.body;
  const updateField = DOC_TYPES[type];
  if (!updateField) {
    return sendError(res, 400, 'Document type must be pan, aadhaar, or bank');
  }

  const docUrl = `/uploads/documents/${req.file.filename}`;

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    profile = new Profile({ user: req.user._id });
  }

  profile[updateField] = docUrl;
  await profile.save();

  const kycCompleted = await syncUserKycCompleted(req.user._id, profile);

  sendResponse(res, 200, 'Document uploaded', { ...profile.toObject(), kycCompleted });
});