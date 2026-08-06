import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import Otp from '../models/Otp.js';
import Commission from '../models/Commission.js';
import Purchase from '../models/Purchase.js';
import bcrypt from 'bcryptjs';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { ROLES } from '../config/permissions.js';
import { canAccessAdminScope } from '../middlewares/scope.js';
import { createNotification } from '../services/notificationService.js';
import { createOtp, verifyOtp } from '../services/otpService.js';
import { sendOtpSms } from '../services/smsService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { getSettings } from '../services/settingsService.js';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(value);
const ADMIN_INVITE_PURPOSE = 'admin_invite';

const parseAdminCredential = (raw) => {
  const credential = (raw || '').trim();
  if (isValidEmail(credential)) {
    return { type: 'email', value: credential.toLowerCase() };
  }
  if (isValidMobile(credential)) {
    return { type: 'mobile', value: credential };
  }
  return null;
};

const findExistingByCredential = async (parsed) => {
  if (parsed.type === 'email') {
    return User.findOne({ email: parsed.value, isDeleted: { $ne: true } });
  }
  return User.findOne({
    $or: [{ mobile_number: parsed.value }, { mobile: parsed.value }],
    isDeleted: { $ne: true },
  });
};

/**
 * @route   POST /api/admin/manage/admins/send-otp
 * Super Admin invites admin via email OR mobile (single field)
 */
export const sendAdminInviteOtp = asyncHandler(async (req, res) => {
  const parsed = parseAdminCredential(req.body.credential || req.body.email || req.body.mobile);
  if (!parsed) {
    return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
  }

  if (await findExistingByCredential(parsed)) {
    return sendError(
      res,
      400,
      parsed.type === 'email' ? 'Email already exists' : 'Mobile already exists'
    );
  }

  const otp = await createOtp(parsed.value, ADMIN_INVITE_PURPOSE);
  const isDev = process.env.NODE_ENV === 'development';
  let delivery = { success: false, error: null };

  if (parsed.type === 'mobile') {
    delivery = await sendOtpSms(parsed.value, otp, ADMIN_INVITE_PURPOSE);
  } else {
    delivery = await sendOtpEmail(parsed.value, otp, ADMIN_INVITE_PURPOSE);
  }

  if (!delivery.success && !isDev) {
    return sendError(res, 502, `Unable to send OTP: ${delivery.error || 'delivery failed'}`);
  }

  if (!delivery.success && isDev) {
    console.warn(`[DEV] Admin invite OTP delivery failed (${delivery.error}). OTP for ${parsed.value}: ${otp}`);
  }

  sendResponse(
    res,
    200,
    delivery.success ? 'OTP sent successfully' : 'OTP generated (development mode)',
    {
      credential: parsed.value,
      type: parsed.type,
      expiresIn: 600,
      ...(isDev && { otp }),
      ...(!delivery.success && isDev && { deliverySkipped: true }),
    }
  );
});

/**
 * @route   POST /api/admin/manage/admins/verify-otp
 */
export const verifyAdminInviteOtp = asyncHandler(async (req, res) => {
  const parsed = parseAdminCredential(req.body.credential || req.body.email || req.body.mobile);
  const otp = (req.body.otp || '').trim();

  if (!parsed) {
    return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
  }
  if (!/^\d{6}$/.test(otp)) {
    return sendError(res, 400, 'Valid 6-digit OTP is required');
  }

  const result = await verifyOtp(parsed.value, otp, ADMIN_INVITE_PURPOSE);
  if (!result.valid) {
    return sendError(res, 400, result.message);
  }

  sendResponse(res, 200, 'OTP verified successfully', {
    credential: parsed.value,
    type: parsed.type,
    verified: true,
  });
});

export const getAdmins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { search, status } = req.query;

  const filter = { role: ROLES.ADMIN, isDeleted: { $ne: true } };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile_number: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const [admins, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const adminIds = admins.map((a) => a._id);
  const joinedUsers = adminIds.length
    ? await User.find({
      role: ROLES.USER,
      adminId: { $in: adminIds },
      isDeleted: { $ne: true },
    }).select('name email mobile_number adminId walletBalance createdAt isActive').sort('-createdAt')
    : [];

  const joinedUserIds = joinedUsers.map((u) => u._id);
  const loanSummaries = joinedUserIds.length
    ? await Loan.aggregate([
      {
        $match: {
          user: { $in: joinedUserIds },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$user',
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'disbursed', 'approved']] }, 1, 0],
            },
          },
          pendingLoans: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'under_review']] }, 1, 0],
            },
          },
          closedLoans: {
            $sum: {
              $cond: [{ $eq: ['$status', 'closed'] }, 1, 0],
            },
          },
          totalLoanAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paidAmount' },
          remainingBalance: { $sum: '$remainingBalance' },
        },
      },
    ])
    : [];

  const summaryByUser = new Map(loanSummaries.map((s) => [s._id.toString(), s]));

  const emiSummaries = joinedUserIds.length
    ? await EMI.aggregate([
      {
        $match: {
          user: { $in: joinedUserIds },
          isDeleted: { $ne: true },
        },
      },
      {
        $addFields: {
          totalDue: {
            $add: [
              { $ifNull: ['$amount', 0] },
              { $ifNull: ['$penalty', 0] },
              { $ifNull: ['$lateFee', 0] },
              { $ifNull: ['$dailyPenalty', 0] },
            ],
          },
          isPending: {
            $in: ['$status', ['pending', 'overdue', 'partial']],
          },
        },
      },
      {
        $group: {
          _id: '$user',
          totalEMIs: { $sum: 1 },
          pendingEMIs: {
            $sum: { $cond: ['$isPending', 1, 0] },
          },
          totalEmiAmount: { $sum: '$totalDue' },
          pendingEmiAmount: {
            $sum: {
              $cond: [
                '$isPending',
                {
                  $cond: [
                    { $gt: [{ $ifNull: ['$pendingAmount', 0] }, 0] },
                    { $ifNull: ['$pendingAmount', 0] },
                    '$totalDue',
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ])
    : [];

  const emiSummaryByUser = new Map(emiSummaries.map((s) => [s._id.toString(), s]));

  const [commissionTotals, purchaseTotals] = adminIds.length
    ? await Promise.all([
      Commission.aggregate([
        {
          $match: {
            admin: { $in: adminIds },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$admin',
            totalCommissionEarned: { $sum: '$commissionAmount' },
            commissionCount: { $sum: 1 },
          },
        },
      ]),
      Purchase.aggregate([
        {
          $match: {
            requestedBy: { $in: adminIds },
            status: 'approved',
          },
        },
        {
          $group: {
            _id: '$requestedBy',
            totalPurchase: { $sum: '$amount' },
            purchaseCount: { $sum: 1 },
          },
        },
      ]),
    ])
    : [[], []];

  const commissionByAdmin = new Map(
    commissionTotals.map((c) => [c._id.toString(), c])
  );
  const purchaseByAdmin = new Map(
    purchaseTotals.map((p) => [p._id.toString(), p])
  );

  const usersByAdmin = new Map();
  joinedUsers.forEach((u) => {
    const key = u.adminId?.toString();
    if (!key) return;
    const loanSummary = summaryByUser.get(u._id.toString());
    const emiSummary = emiSummaryByUser.get(u._id.toString());
    const enrichedUser = {
      ...u.toObject(),
      summary: {
        totalLoans: loanSummary?.totalLoans || 0,
        activeLoans: loanSummary?.activeLoans || 0,
        pendingLoans: loanSummary?.pendingLoans || 0,
        closedLoans: loanSummary?.closedLoans || 0,
        totalLoanAmount: loanSummary?.totalLoanAmount || 0,
        totalPaid: loanSummary?.totalPaid || 0,
        remainingBalance: loanSummary?.remainingBalance || 0,
        totalEMIs: emiSummary?.totalEMIs || 0,
        pendingEMIs: emiSummary?.pendingEMIs || 0,
        totalEmiAmount: emiSummary?.totalEmiAmount || 0,
        pendingEmiAmount: emiSummary?.pendingEmiAmount || 0,
      },
    };
    if (!usersByAdmin.has(key)) usersByAdmin.set(key, []);
    usersByAdmin.get(key).push(enrichedUser);
  });

  const enrichedAdmins = admins.map((admin) => {
    const list = usersByAdmin.get(admin._id.toString()) || [];
    const commission = commissionByAdmin.get(admin._id.toString());
    const purchase = purchaseByAdmin.get(admin._id.toString());
    return {
      ...admin.toObject(),
      joinedUsersCount: list.length,
      joinedUsers: list,
      totalCommissionEarned: commission?.totalCommissionEarned || 0,
      commissionCount: commission?.commissionCount || 0,
      totalPurchase: purchase?.totalPurchase || 0,
      purchaseCount: purchase?.purchaseCount || 0,
    };
  });

  sendResponse(res, 200, 'Admins fetched', enrichedAdmins, paginationMeta(total, page, limit));
});

/**
 * @route   POST /api/admins
 * OTP invite: { credential, otp?, firstName, middleName?, lastName, password }
 * Legacy: { name, email, mobile, password } (unchanged response)
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const {
    credential,
    otp,
    firstName,
    middleName,
    lastName,
    name,
    email,
    mobile,
    password,
    commissionRate,
  } = req.body;

  // ── New: single credential + OTP + name parts ──
  if (credential || firstName || lastName) {
    const parsed = parseAdminCredential(credential || email || mobile);
    if (!parsed) {
      return sendError(res, 400, 'Please enter a valid email or 10-digit mobile number');
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      return sendError(res, 400, 'First name and last name are required');
    }
    if (!password || String(password).length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    if (await findExistingByCredential(parsed)) {
      return sendError(
        res,
        400,
        parsed.type === 'email' ? 'Email already exists' : 'Mobile already exists'
      );
    }

    // Prefer already-verified invite OTP; otherwise verify provided OTP once
    let inviteOk = await Otp.findOne({
      mobile: parsed.value,
      purpose: ADMIN_INVITE_PURPOSE,
      isVerified: true,
      expiresAt: { $gt: new Date() },
    }).sort('-createdAt');

    if (!inviteOk) {
      if (!otp) {
        return sendError(res, 400, 'OTP verification required');
      }
      const otpResult = await verifyOtp(parsed.value, String(otp).trim(), ADMIN_INVITE_PURPOSE);
      if (!otpResult.valid) {
        return sendError(res, 400, otpResult.message);
      }
    }

    const composedName = [firstName, middleName, lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');

    const settings = await getSettings();
    const defaultRate = settings.adminCommissionRate ?? 2;

    const admin = await User.create({
      name: composedName,
      firstName: firstName.trim(),
      middleName: middleName?.trim() || '',
      lastName: lastName.trim(),
      password,
      ...(parsed.type === 'email'
        ? { email: parsed.value }
        : { mobile_number: parsed.value }),
      role: ROLES.ADMIN,
      commissionRate: commissionRate ?? defaultRate,
      createdBy: req.user._id,
      isActive: true,
      isEmailVerified: parsed.type === 'email',
      isMobileVerified: parsed.type === 'mobile',
      registrationMethod: parsed.type === 'email' ? 'email' : 'mobile',
      profileSetupComplete: true,
    });

    await Profile.create({
      user: admin._id,
      phone: parsed.type === 'mobile' ? parsed.value : '',
    });

    await Otp.deleteMany({ mobile: parsed.value, purpose: ADMIN_INVITE_PURPOSE });

    await createAuditLog({
      user: req.user._id,
      action: `Created admin: ${parsed.value}`,
      entity: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
    });

    return sendResponse(res, 201, 'Admin created successfully', admin);
  }

  // ── Legacy create (unchanged contract) ──
  if (await User.findOne({ email, isDeleted: { $ne: true } })) {
    return sendError(res, 400, 'Email already exists');
  }
  const legacyMobile = mobile || req.body.mobile_number;
  if (
    legacyMobile
    && await User.findOne({
      $or: [{ mobile_number: legacyMobile }, { mobile: legacyMobile }],
      isDeleted: { $ne: true },
    })
  ) {
    return sendError(res, 400, 'Mobile already exists');
  }

  const settings = await getSettings();
  const defaultRate = settings.adminCommissionRate ?? 2;

  const admin = await User.create({
    name,
    email,
    ...(legacyMobile ? { mobile_number: legacyMobile } : {}),
    password,
    role: ROLES.ADMIN,
    commissionRate: commissionRate ?? defaultRate,
    createdBy: req.user._id,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: !!legacyMobile,
  });

  await Profile.create({ user: admin._id, phone: legacyMobile || '' });

  await createAuditLog({
    user: req.user._id,
    action: `Created admin: ${email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'Admin created successfully', admin);
});

/**
 * @route   PUT /api/admins/:id
 */
export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, isDeleted: { $ne: true } });
  if (!admin) return sendError(res, 404, 'Admin not found');

  const { name, firstName, middleName, lastName, email, mobile, mobile_number, commissionRate, isActive } = req.body;
  if (firstName !== undefined) admin.firstName = firstName;
  if (middleName !== undefined) admin.middleName = middleName;
  if (lastName !== undefined) admin.lastName = lastName;
  if (name && !firstName && !lastName) admin.name = name;
  if (email && email !== admin.email) {
    if (await User.findOne({ email, _id: { $ne: admin._id }, isDeleted: { $ne: true } })) {
      return sendError(res, 400, 'Email already exists');
    }
    admin.email = email;
  }
  const nextMobile = mobile_number || mobile;
  if (nextMobile && nextMobile !== admin.mobile_number) {
    if (await User.findOne({
      $or: [{ mobile_number: nextMobile }, { mobile: nextMobile }],
      _id: { $ne: admin._id },
      isDeleted: { $ne: true },
    })) {
      return sendError(res, 400, 'Mobile already exists');
    }
    admin.mobile_number = nextMobile;
  }
  if (commissionRate !== undefined) admin.commissionRate = commissionRate;
  if (isActive !== undefined) admin.isActive = isActive;

  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Updated admin: ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Admin updated', admin);
});

/**
 * @route   DELETE /api/admins/:id
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, isDeleted: { $ne: true } });
  if (!admin) return sendError(res, 404, 'Admin not found');

  admin.isDeleted = true;
  admin.deletedAt = new Date();
  admin.isActive = false;
  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Deleted admin: ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Admin deleted');
});

/**
 * @route   PUT /api/admins/:id/activate
 */
export const activateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, isDeleted: { $ne: true } });
  if (!admin) return sendError(res, 404, 'Admin not found');

  admin.isActive = true;
  admin.isSuspended = false;
  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Activated admin: ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Admin activated', admin);
});

/**
 * @route   PUT /api/admins/:id/deactivate
 */
export const deactivateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, isDeleted: { $ne: true } });
  if (!admin) return sendError(res, 404, 'Admin not found');

  admin.isActive = false;
  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Deactivated admin: ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Admin deactivated', admin);
});

/**
 * @route   PUT /api/admins/:id/reset-password
 */
export const resetAdminPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return sendError(res, 400, 'Password must be at least 6 characters');
  }

  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, isDeleted: { $ne: true } })
    .select('+password');
  if (!admin) return sendError(res, 404, 'Admin not found');

  admin.password = password;
  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Reset password for admin: ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Admin password reset successfully');
});

/**
 * @route   PUT /api/admins/users/:userId/assign
 * Assign or transfer user to an admin
 */
export const assignUserToAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  const user = await User.findOne({ _id: req.params.userId, role: ROLES.USER, isDeleted: { $ne: true } });
  if (!user) return sendError(res, 404, 'User not found');

  const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN, isActive: true, isDeleted: { $ne: true } });
  if (!admin) return sendError(res, 404, 'Admin not found');

  user.adminId = admin._id;
  await user.save();

  await Loan.updateMany({ user: user._id }, { adminId: admin._id });

  await createAuditLog({
    user: req.user._id,
    action: `Assigned user ${user.email || user.mobile} to admin ${admin.email}`,
    entity: 'user',
    entityId: user._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'User assigned to admin', user);
});

/**
 * @route   GET /api/admins/:id/stats
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const adminId = req.params.id;

  if (!canAccessAdminScope(req.user, adminId) && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Not authorized');
  }

  const [userCount, loanCount, pendingLoans, approvedLoans] = await Promise.all([
    User.countDocuments({ adminId, role: ROLES.USER, isDeleted: { $ne: true } }),
    Loan.countDocuments({ adminId, isDeleted: { $ne: true } }),
    Loan.countDocuments({ adminId, status: 'pending', isDeleted: { $ne: true } }),
    Loan.countDocuments({ adminId, status: { $in: ['approved', 'disbursed', 'active'] }, isDeleted: { $ne: true } }),
  ]);

  sendResponse(res, 200, 'Admin stats fetched', { userCount, loanCount, pendingLoans, approvedLoans });
});



