import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { mask } from '../utils/encryption.js';

/**
 * @route   POST /api/kyc/submit
 */
export const submitKyc = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) return sendError(res, 404, 'Profile not found');

  const required = ['pan', 'aadhaar', 'address', 'bankName', 'accountNumber', 'ifscCode'];
  const decrypted = profile.getDecrypted();
  const missing = required.filter((f) => !decrypted[f] && !req.body[f]);
  if (missing.length) {
    return sendError(res, 400, `Missing KYC fields: ${missing.join(', ')}`);
  }

  Object.assign(profile, req.body);
  profile.kycStatus = 'submitted';
  profile.kycSubmittedAt = new Date();
  await profile.save();

  await User.findByIdAndUpdate(req.user._id, { kycCompleted: false });

  await createAuditLog({
    user: req.user._id,
    action: 'KYC submitted',
    entity: 'profile',
    entityId: profile._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'KYC submitted for review', { kycStatus: profile.kycStatus });
});

/**
 * @route   GET /api/kyc/status
 */
export const getKycStatus = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  sendResponse(res, 200, 'KYC status', {
    kycStatus: profile?.kycStatus || 'pending',
    kycSubmittedAt: profile?.kycSubmittedAt,
    kycVerifiedAt: profile?.kycVerifiedAt,
    kycRejectedReason: profile?.kycRejectedReason,
    kycCompleted: req.user.kycCompleted,
  });
});

/**
 * @route   GET /api/kyc/pending
 */
export const getPendingKyc = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);

  const filter = { kycStatus: { $in: ['submitted', 'under_review'] }, isDeleted: { $ne: true } };
  const [profiles, total] = await Promise.all([
    Profile.find(filter).populate('user', 'name email mobile').skip(skip).limit(limit).sort('-kycSubmittedAt'),
    Profile.countDocuments(filter),
  ]);

  const data = profiles.map((p) => {
    const d = p.getDecrypted();
    return {
      ...p.toObject(),
      pan: mask(d.pan),
      aadhaar: mask(d.aadhaar),
      accountNumber: mask(d.accountNumber),
    };
  });

  sendResponse(res, 200, 'Pending KYC applications', data, paginationMeta(total, page, limit));
});

/**
 * @route   PUT /api/kyc/:userId/review
 */
export const reviewKyc = asyncHandler(async (req, res) => {
  const { status, rejectedReason } = req.body;
  if (!['verified', 'rejected', 'under_review'].includes(status)) {
    return sendError(res, 400, 'Invalid KYC status');
  }

  const profile = await Profile.findOne({ user: req.params.userId });
  if (!profile) return sendError(res, 404, 'Profile not found');

  profile.kycStatus = status;
  if (status === 'verified') {
    profile.kycVerifiedAt = new Date();
    profile.kycVerifiedBy = req.user._id;
    await User.findByIdAndUpdate(req.params.userId, { kycCompleted: true });
  } else if (status === 'rejected') {
    profile.kycRejectedReason = rejectedReason || 'KYC rejected';
    await User.findByIdAndUpdate(req.params.userId, { kycCompleted: false });
  }

  await profile.save();

  await createNotification({
    user: req.params.userId,
    title: `KYC ${status}`,
    message: status === 'verified' ? 'Your KYC has been verified. You can now apply for loans.' :
      `Your KYC was rejected. ${rejectedReason || ''}`,
    type: status === 'verified' ? 'success' : 'error',
    link: '/profile',
  });

  await createAuditLog({
    user: req.user._id,
    action: `KYC ${status} for user ${req.params.userId}`,
    entity: 'profile',
    entityId: profile._id,
    details: { status, rejectedReason },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, `KYC ${status}`, profile);
});
