import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * @route   GET /api/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  sendResponse(res, 200, 'Profile fetched', { user: req.user, profile });
});

/**
 * @route   PUT /api/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'phone', 'dateOfBirth', 'gender', 'address', 'city', 'state', 'pincode',
    'bankName', 'accountNumber', 'ifscCode', 'accountHolderName', 'pan', 'aadhaar',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    updates,
    { new: true, upsert: true, runValidators: true }
  );

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

  sendResponse(res, 200, 'Profile updated', profile);
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
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded');

  const { type } = req.body; // 'pan' or 'aadhaar'
  if (!['pan', 'aadhaar'].includes(type)) {
    return sendError(res, 400, 'Document type must be pan or aadhaar');
  }

  const docUrl = `/uploads/documents/${req.file.filename}`;
  const updateField = type === 'pan' ? 'panDocument' : 'aadhaarDocument';

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { [updateField]: docUrl, kycStatus: 'pending' },
    { new: true, upsert: true }
  );

  sendResponse(res, 200, 'Document uploaded', profile);
});
