import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateToken, hashToken } from '../utils/helpers.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { verifyOtp } from '../services/otpService.js';
import { sendOtpSms } from '../services/smsService.js';
import { createOtp } from '../services/otpService.js';
import { createNotification } from '../services/notificationService.js';
import { LOGIN_PORTALS, ROLES } from '../config/permissions.js';
import { registerFcmToken, unregisterFcmToken } from '../services/pushService.js';

// --- Helper Functions ---

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(value);
const isValidCredential = (value) => isValidEmail(value) || isValidMobile(value);

const findUserByCredential = async (credential) => {
  const isEmail = isValidEmail(credential);
  const isMobile = isValidMobile(credential);
  
  if (isEmail) {
    return await User.findOne({ 
      email: credential.toLowerCase(), 
      isDeleted: { $ne: true } 
    }).select('+password +refreshToken');
  } else if (isMobile) {
    return await User.findOne({ 
      $or: [
        { mobile_number: credential },
        { mobile: credential }
      ],
      isDeleted: { $ne: true } 
    }).select('+password +refreshToken');
  }
  return null;
};

const validateLoginPortal = (user, portal) => {
  if (!portal) return { valid: true };
  const allowed = LOGIN_PORTALS[portal];
  if (!allowed) return { valid: true };
  if (!allowed.includes(user.role)) {
    return { valid: false, message: `This account cannot login via ${portal} portal` };
  }
  return { valid: true };
};

const notifyAdminsOnRegistration = async (user) => {
  const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN, isActive: true, isDeleted: { $ne: true } });
  const recipients = [...superAdmins];

  if (user.adminId) {
    const admin = await User.findById(user.adminId);
    if (admin) recipients.push(admin);
  }

  const uniqueIds = new Set();
  for (const admin of recipients) {
    const id = admin._id.toString();
    if (uniqueIds.has(id)) continue;
    uniqueIds.add(id);
    await createNotification({
      user: admin._id,
      title: 'New User Registered',
      message: `${user.name} has registered on the platform.`,
      type: 'info',
    });
  }
};

// --- Public Auth Routes ---

/**
 * @route   GET /api/auth/admins
 * Public — active admin list for user registration dropdown
 */
export const listPublicAdmins = asyncHandler(async (_req, res) => {
  const admins = await User.find({
    role: ROLES.ADMIN,
    isActive: true,
    isSuspended: { $ne: true },
    isDeleted: { $ne: true },
  })
    .select('_id name firstName lastName')
    .sort('name');

  sendResponse(res, 200, 'Admins fetched', admins);
});

/**
 * @route   POST /api/auth/register
 */
const buildFullName = (firstName, middleName, lastName, fallbackName = '') => {
  const composed = [firstName, middleName, lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
  return composed || (fallbackName || '').trim();
};

export const register = asyncHandler(async (req, res) => {
  const {  
    firstName,
    middleName,
    lastName,
    credential, 
    email, 
    password, 
    phone, 
    mobile, 
    adminId 
  } = req.body;

  const fullName = buildFullName(firstName, middleName, lastName,);
  if (!fullName) {
    return sendError(res, 400, 'Name is required');
  }

  // Determine email and mobile from credential or direct fields
  let userEmail = email;
  let userMobile = mobile;

  // If credential is provided, parse it
  if (credential) {
    const isEmail = isValidEmail(credential);
    const isMobile = isValidMobile(credential);
    
    if (!isEmail && !isMobile) {
      return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
    }
    
    if (isEmail) {
      userEmail = credential.toLowerCase();
    } else if (isMobile) {
      userMobile = credential;
    }
  }

  // Validate that we have at least one credential
  if (!userEmail && !userMobile) {
    return sendError(res, 400, 'Email or mobile number is required');
  }

  // Validate adminId
  if (!adminId) {
    return sendError(res, 400, 'Please select an Admin');
  }

  const owningAdmin = await User.findOne({
    _id: adminId,
    role: ROLES.ADMIN,
    isActive: true,
    isSuspended: { $ne: true },
    isDeleted: { $ne: true },
  });
  if (!owningAdmin) {
    return sendError(res, 400, 'Selected Admin is invalid or inactive');
  }

  // Check for existing email
  if (userEmail) {
    const existingUser = await User.findOne({ 
      email: userEmail, 
      isDeleted: { $ne: true } 
    });
    if (existingUser) {
      return sendError(res, 400, 'Email already registered');
    }
  }

  // Check for existing mobile
  if (userMobile) {
    const existingMobile = await User.findOne({ 
      $or: [
        { mobile_number: userMobile },
        { mobile: userMobile }
      ],
      isDeleted: { $ne: true } 
    });
    if (existingMobile) {
      return sendError(res, 400, 'Mobile number already registered');
    }
  }

  // Create user object
  const userData = {
    name: fullName,
    ...(firstName?.trim() && { firstName: firstName.trim() }),
    ...(middleName?.trim() && { middleName: middleName.trim() }),
    ...(lastName?.trim() && { lastName: lastName.trim() }),
    password,
    role: 'user',
    adminId: owningAdmin._id,
    registrationMethod: userEmail ? 'email' : 'mobile',
    isEmailVerified: !!userEmail,
    isMobileVerified: !!userMobile,
    profileSetupComplete: true,
  };

  // Only add email and mobile if they exist
  if (userEmail) userData.email = userEmail;
  if (userMobile) userData.mobile_number = userMobile;

  const user = await User.create(userData);

  // Create profile
  await Profile.create({ 
    user: user._id, 
    phone: phone || userMobile || '' 
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Send welcome email if email provided
  if (userEmail) sendWelcomeEmail(user);
  
  // Notify admins about registration
  await notifyAdminsOnRegistration(user);

  // Audit log
  await createAuditLog({
    user: user._id,
    action: 'User registered',
    entity: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, 'Registration successful', {
    user,
    accessToken,
    refreshToken,
  });
});

/**
 * @route   POST /api/auth/register-mobile
 * Step 1: Register with mobile + OTP only. Profile completed later.
 */
export const registerMobile = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  if (!isValidMobile(mobile)) {
    return sendError(res, 400, 'Valid 10-digit mobile number is required');
  }

  const otpResult = await verifyOtp(mobile, otp, 'registration');
  if (!otpResult.valid) {
    return sendError(res, 400, otpResult.message);
  }

  const existingMobile = await User.findOne({
    $or: [{ mobile_number: mobile }, { mobile: mobile }],
    isDeleted: { $ne: true },
  });
  if (existingMobile) {
    return sendError(res, 400, 'Mobile number already registered');
  }

  const user = await User.create({
    name: `User ${mobile.slice(-4)}`,
    mobile_number: mobile,
    role: 'user',
    registrationMethod: 'mobile',
    isMobileVerified: true,
    profileSetupComplete: false,
  });

  await Profile.create({ user: user._id, phone: mobile });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  await createAuditLog({
    user: user._id,
    action: 'User registered via mobile',
    entity: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, 'Mobile registration successful', {
    user,
    accessToken,
    refreshToken,
    requiresProfileSetup: true,
  });
});

/**
 * @route   PUT /api/auth/complete-profile
 * Step 2: Complete profile after mobile registration.
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const { firstName, middleName, lastName, adminId, password, email } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return sendError(res, 404, 'User not found');

  if (user.profileSetupComplete) {
    return sendError(res, 400, 'Profile setup already completed');
  }

  if (!firstName?.trim() || !lastName?.trim()) {
    return sendError(res, 400, 'First name and last name are required');
  }

  if (!adminId) {
    return sendError(res, 400, 'Please select an Admin');
  }

  if (!password) {
    return sendError(res, 400, 'Password is required');
  }

  const owningAdmin = await User.findOne({
    _id: adminId,
    role: ROLES.ADMIN,
    isActive: true,
    isSuspended: { $ne: true },
    isDeleted: { $ne: true },
  });
  if (!owningAdmin) {
    return sendError(res, 400, 'Selected Admin is invalid or inactive');
  }

  if (email) {
    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: { $ne: true },
      _id: { $ne: user._id },
    });
    if (existingEmail) {
      return sendError(res, 400, 'Email already registered');
    }
    user.email = email.toLowerCase();
  }

  const fullName = buildFullName(firstName, middleName, lastName);
  user.firstName = firstName.trim();
  user.middleName = middleName?.trim() || '';
  user.lastName = lastName.trim();
  user.name = fullName;
  user.adminId = owningAdmin._id;
  user.password = password;
  user.profileSetupComplete = true;
  await user.save();

  const profile = await Profile.findOneAndUpdate(
    { user: user._id },
    { phone: user.mobile_number || user.mobile || '' },
    { new: true, upsert: true, runValidators: true }
  );

  if (user.email) sendWelcomeEmail(user);
  await notifyAdminsOnRegistration(user);

  await createAuditLog({
    user: user._id,
    action: 'Profile setup completed',
    entity: 'profile',
    entityId: profile._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, 'Profile completed successfully', {
    user: user.toJSON(),
    profile,
  });
});

/**
 * @route   POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { password, portal } = req.body;
  const credential = (req.body.credential || req.body.email || req.body.mobile || '').trim();

  // Validate credential is provided
  if (!credential) {
    return sendError(res, 400, 'Email or mobile number is required');
  }

  // Validate credential format
  if (!isValidCredential(credential)) {
    return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
  }

  // Find user by credential
  const user = await findUserByCredential(credential);
  
  if (!user) {
    return sendError(res, 401, 'Invalid email/mobile or password');
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 401, 'Invalid email/mobile or password');
  }

  // Check account status
  if (!user.isActive || user.isSuspended) {
    return sendError(res, 403, 'Account is suspended or inactive');
  }

  // Validate portal access
  const portalCheck = validateLoginPortal(user, portal);
  if (!portalCheck.valid) {
    return sendError(res, 403, portalCheck.message);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Create audit log
  await createAuditLog({
    user: user._id,
    action: 'User logged in',
    entity: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const userObj = user.toJSON();
  sendResponse(res, 200, 'Login successful', {
    user: userObj,
    accessToken,
    refreshToken,
  });
});

/**
 * @route   POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  await createAuditLog({
    user: req.user._id,
    action: 'User logged out',
    entity: 'auth',
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Logged out successfully');
});

/**
 * @route   POST /api/auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return sendError(res, 400, 'Refresh token is required');

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return sendError(res, 401, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    sendResponse(res, 200, 'Token refreshed', { accessToken, refreshToken: newRefreshToken });
  } catch {
    return sendError(res, 401, 'Invalid or expired refresh token');
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * Email users get a reset link; mobile users get an OTP via SMS (stored on user).
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { credential, email, mobile } = req.body;

  const inputCredential = credential || email || mobile || '';
  const preferOtp = isValidMobile(inputCredential) || Boolean(mobile && !email && !credential);

  let user = null;

  if (credential) {
    user = await findUserByCredential(credential);
  }

  if (!user && email) {
    user = await User.findOne({ email, isDeleted: { $ne: true } });
  }

  if (!user && mobile) {
    user = await User.findOne({
      $or: [{ mobile_number: mobile }, { mobile: mobile }],
      isDeleted: { $ne: true },
    });
  }

  // Same response shape whether or not the account exists (security)
  if (!user) {
    return sendResponse(
      res,
      200,
      preferOtp ? 'If account exists, OTP has been sent' : 'If account exists, reset link has been sent',
      { method: preferOtp ? 'otp' : 'email' }
    );
  }

  const userMobile = user.mobile_number || user.mobile;

  // Mobile path: store OTP on user + send SMS (Enlaz-style)
  if (preferOtp && userMobile) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.is_otp_verified = false;
    await user.save({ validateBeforeSave: false });

    const smsResult = await sendOtpSms(userMobile, otp, 'password_reset');
    if (!smsResult.success) {
      return sendError(res, 502, `Unable to send OTP: ${smsResult.error}`);
    }

    return sendResponse(res, 200, 'OTP is sent to mobile number', {
      method: 'otp',
      mobile: userMobile,
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  }

  // Email path: keep existing reset-link behaviour
  const { token, hashedToken } = generateToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour
  await user.save({ validateBeforeSave: false });

  if (user.email) {
    await sendPasswordResetEmail(user, token);
  }

  // If email path but user only has mobile, still send OTP as fallback
  if (!user.email && userMobile) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.is_otp_verified = false;
    await user.save({ validateBeforeSave: false });

    const smsResult = await sendOtpSms(userMobile, otp, 'password_reset');
    if (!smsResult.success) {
      return sendError(res, 502, `Unable to send OTP: ${smsResult.error}`);
    }
    return sendResponse(res, 200, 'OTP is sent to mobile number', {
      method: 'otp',
      mobile: userMobile,
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  }

  sendResponse(res, 200, 'If account exists, reset link has been sent', { method: 'email' });
});

/**
 * @route   POST /api/auth/verify-reset-otp
 * Verify forgot-password OTP (marks is_otp_verified).
 */
export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { credential, mobile, otp } = req.body;
  const phone = mobile || credential;

  if (!phone || !isValidMobile(phone)) {
    return sendError(res, 400, 'Valid 10-digit mobile number is required');
  }
  if (!otp) {
    return sendError(res, 400, 'OTP is required');
  }

  const user = await User.findOne({
    $or: [{ mobile_number: phone }, { mobile: phone }],
    isDeleted: { $ne: true },
  }).select('+otp +otp_expiry +is_otp_verified');

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  if (!user.otp || !user.otp_expiry || user.otp_expiry < new Date()) {
    return sendError(res, 400, 'OTP expired. Please request a new one.');
  }

  if (user.otp !== String(otp).trim()) {
    return sendError(res, 400, 'Invalid OTP');
  }

  user.otp = undefined;
  user.otp_expiry = undefined;
  user.is_otp_verified = true;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, 'OTP verified successfully', { mobile: phone, verified: true });
});

/**
 * @route   POST /api/auth/reset-password-otp
 * Reset password using mobile OTP (forgot-password flow).
 * Accepts either: OTP + password together, or password after verify-reset-otp.
 */
export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { mobile, credential, otp, password, confirmPassword } = req.body;
  const phone = mobile || credential;

  if (!phone || !isValidMobile(phone)) {
    return sendError(res, 400, 'Valid 10-digit mobile number is required');
  }
  if (!password) {
    return sendError(res, 400, 'Password is required');
  }
  if (confirmPassword && password !== confirmPassword) {
    return sendError(res, 400, 'Passwords do not match');
  }

  const user = await User.findOne({
    $or: [{ mobile_number: phone }, { mobile: phone }],
    isDeleted: { $ne: true },
  }).select('+password +otp +otp_expiry +is_otp_verified');

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  // Path A: OTP provided with password (current frontend one-step flow)
  if (otp) {
    if (!user.otp || !user.otp_expiry || user.otp_expiry < new Date()) {
      return sendError(res, 400, 'OTP expired. Please request a new one.');
    }
    if (user.otp !== String(otp).trim()) {
      return sendError(res, 400, 'Invalid OTP');
    }
  } else if (!user.is_otp_verified) {
    // Path B: Enlaz-style — OTP already verified earlier
    return sendError(res, 400, 'Invalid or expired OTP');
  }

  user.password = password;
  user.otp = undefined;
  user.otp_expiry = undefined;
  user.is_otp_verified = false;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await createAuditLog({
    user: user._id,
    action: 'Password reset via OTP',
    entity: 'auth',
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Password reset successful');
});

/**
 * @route   POST /api/auth/reset-password/:token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = hashToken(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return sendError(res, 400, 'Invalid or expired reset token');
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await createAuditLog({
    user: user._id,
    action: 'Password reset',
    entity: 'auth',
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Password reset successful');
});

/**
 * @route   PUT /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return sendError(res, 400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  await createAuditLog({
    user: user._id,
    action: 'Password changed',
    entity: 'auth',
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Password changed successfully');
});

/**
 * @route   GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  sendResponse(res, 200, 'User profile fetched', { user: req.user, profile });
});

/**
 * @route   POST /api/auth/fcm-token
 * Register device token for mobile / web push notifications
 */
export const saveFcmToken = asyncHandler(async (req, res) => {
  const token = (req.body.token || '').trim();
  const platform = (req.body.platform || 'web').trim().toLowerCase();
  if (!token) return sendError(res, 400, 'FCM token is required');

  const allowed = ['web', 'android', 'ios', 'mobile'];
  const platformValue = allowed.includes(platform) ? platform : 'web';

  await registerFcmToken(req.user._id, token, platformValue);
  sendResponse(res, 200, 'Push notification token saved', { registered: true });
});

/**
 * @route   DELETE /api/auth/fcm-token
 */
export const removeFcmToken = asyncHandler(async (req, res) => {
  const token = (req.body.token || '').trim();
  if (!token) return sendError(res, 400, 'FCM token is required');
  await unregisterFcmToken(req.user._id, token);
  sendResponse(res, 200, 'Push notification token removed', { removed: true });
});

/**
 * @route   POST /api/auth/send-login-otp
 */
export const sendLoginOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const user = await User.findOne({ 
    $or: [
      { mobile_number: mobile },
      { mobile: mobile }
    ],
    isDeleted: { $ne: true } 
  });
  if (!user) return sendError(res, 404, 'Mobile number not registered');

  const otp = await createOtp(mobile, 'login');
  const smsResult = await sendOtpSms(mobile, otp, 'login');
  if (!smsResult.success) {
    return sendError(res, 502, `Unable to send OTP: ${smsResult.error}`);
  }

  sendResponse(res, 200, 'OTP sent', {
    ...(process.env.NODE_ENV === 'development' && { otp }),
  });
});

// --- Admin Panel Auth Routes ---

import { ADMIN_PANEL_ROLES, getDashboardPath } from '../config/permissions.js';

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
  const { credential, email, password } = req.body;

  // Support both credential and email fields
  let user = null;
  
  if (credential) {
    user = await findUserByCredential(credential);
  } else if (email) {
    user = await User.findOne({ email }).select('+password +refreshToken');
  }

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
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

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
  const { name, email, password, mobile, registrationKey } = req.body;

  const keyCheck = validateAdminRegistrationKey(registrationKey);
  if (!keyCheck.valid) {
    return sendError(res, 403, keyCheck.message);
  }

  if (await User.findOne({ email, isDeleted: { $ne: true } })) {
    return sendError(res, 400, 'Email already registered');
  }

  if (mobile) {
    const mobileFilter = {
      $or: [{ mobile }, { mobile_number: mobile }],
      isDeleted: { $ne: true },
    };
    if (await User.findOne(mobileFilter)) {
      return sendError(res, 400, 'Mobile number already registered');
    }
  }

  const admin = await User.create({
    name,
    email,
    password,
    ...(mobile && { mobile_number: mobile }),
    role: ROLES.ADMIN,
    commissionRate: 2,
    isActive: true,
    isEmailVerified: true,
    registrationMethod: 'email',
  });

  await Profile.create({ user: admin._id, phone: mobile || '' });

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