import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';
import { ADMIN_PANEL_ROLES, ROLES, getDashboardPath } from '../config/permissions.js';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(value);

const findUserByCredential = async (credential) => {
  const value = (credential || '').trim();
  if (!value) return null;

  if (isValidEmail(value)) {
    return User.findOne({
      email: value.toLowerCase(),
      isDeleted: { $ne: true },
    }).select('+password +refreshToken');
  }

  if (isValidMobile(value)) {
    return User.findOne({
      $or: [{ mobile_number: value }, { mobile: value }],
      isDeleted: { $ne: true },
    }).select('+password +refreshToken');
  }

  return null;
};

const validateAdminRegistrationKey = (providedKey) => {
  const requiredKey = process.env.ADMIN_REGISTRATION_KEY;
  if (!requiredKey) return { valid: true };
  if (!providedKey || providedKey !== requiredKey) {
    return { valid: false, message: 'Invalid admin registration key' };
  }
  return { valid: true };
};

/**
 * @route POST /api/admin/auth/login
 * Admin panel login — super_admin, admin only
 */
export const adminPanelLogin = asyncHandler(async (req, res) => {
  const credential = (req.body.credential || req.body.email || req.body.mobile || '').trim();
  const { password } = req.body;

  if (!credential || !password) {
    return sendError(res, 401, 'Invalid email or password');
  }

  const user = await findUserByCredential(credential);
  if (!user || !(await user.comparePassword(password))) {
    return sendError(res, 401, 'Invalid email or password');
  }

  if (!ADMIN_PANEL_ROLES.includes(user.role)) {
    return sendError(res, 403, 'This login is for admin panel only. Use user login.');
  }

  if (!user.isActive || user.isSuspended) {
    return sendError(res, 403, 'Account is suspended or inactive');
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Use updateOne to avoid document pre-save hooks during login
  await User.updateOne(
    { _id: user._id },
    { $set: { refreshToken, lastLogin: new Date() } }
  );

  await createAuditLog({
    user: user._id,
    action: 'Admin panel login',
    entity: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, 'Admin login successful', {
    user: user.toJSON(),
    accessToken,
    refreshToken,
    dashboardPath: getDashboardPath(user.role),
  });
});

/**
 * @route POST /api/admin/auth/register
 * Public admin registration — creates admin role only
 */
export const adminPanelRegister = asyncHandler(async (req, res) => {
  const { name, credential, email, password, mobile, registrationKey } = req.body;

  const keyCheck = validateAdminRegistrationKey(registrationKey);
  if (!keyCheck.valid) {
    return sendError(res, 403, keyCheck.message);
  }

  let adminEmail = email ? email.toLowerCase().trim() : '';
  let adminMobile = mobile || '';

  if (credential) {
    const value = credential.trim();
    if (isValidEmail(value)) {
      adminEmail = value.toLowerCase();
    } else if (isValidMobile(value)) {
      adminMobile = value;
    } else {
      return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
    }
  }

  if (!adminEmail && !adminMobile) {
    return sendError(res, 400, 'Email or mobile number is required');
  }

  if (adminEmail) {
    if (await User.findOne({ email: adminEmail, isDeleted: { $ne: true } })) {
      return sendError(res, 400, 'Email already registered');
    }
  }

  if (adminMobile) {
    const mobileFilter = {
      $or: [{ mobile: adminMobile }, { mobile_number: adminMobile }],
      isDeleted: { $ne: true },
    };
    if (await User.findOne(mobileFilter)) {
      return sendError(res, 400, 'Mobile number already registered');
    }
  }

  const admin = await User.create({
    name,
    password,
    ...(adminEmail && { email: adminEmail }),
    ...(adminMobile && { mobile_number: adminMobile }),
    role: ROLES.ADMIN,
    commissionRate: 2,
    isActive: true,
    isEmailVerified: !!adminEmail,
    isMobileVerified: !!adminMobile,
    registrationMethod: adminEmail ? 'email' : 'mobile',
  });

  await Profile.create({
    user: admin._id,
    ...(adminMobile ? { phone: adminMobile } : {}),
  });

  await createAuditLog({
    user: admin._id,
    action: 'Admin self-registered',
    entity: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, 'Admin registration successful. Please sign in.', {
    user: admin.toJSON(),
  });
});

/**
 * @route GET /api/admin/auth/me
 */
export const adminPanelMe = asyncHandler(async (req, res) => {
  if (!ADMIN_PANEL_ROLES.includes(req.user.role)) {
    return sendError(res, 403, 'Admin panel access only');
  }
  const profile = await Profile.findOne({ user: req.user._id });
  sendResponse(res, 200, 'Admin profile fetched', { user: req.user, profile });
});

/**
 * @route POST /api/admin/auth/logout
 */
export const adminPanelLogout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  await createAuditLog({
    user: req.user._id,
    action: 'Admin panel logout',
    entity: 'auth',
    ipAddress: req.ip,
  });
  sendResponse(res, 200, 'Logged out successfully');
});
