import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import bcrypt from 'bcryptjs';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { exportUsersExcel } from '../utils/excelExport.js';
import { ROLES } from '../config/permissions.js';
import { getAdminScopeFilter, resolveAdminId } from '../middlewares/scope.js';
import { createNotification } from '../services/notificationService.js';

/**
 * @route   GET /api/users
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { search, role, status, sort = '-createdAt', includeAdmin } = req.query;

  const filter = { isDeleted: { $ne: true } };

  // Admin panel (admin + super_admin): list all end-users.
  // Ownership stays on user.adminId for commission; list must not hide registrations.
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
    filter.role = role || ROLES.USER;
  } else {
    Object.assign(filter, getAdminScopeFilter(req.user));
    if (role) filter.role = role;
  }

  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isSuspended = true;
  if (status === 'inactive') filter.isActive = false;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { middleName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { mobile_number: { $regex: search, $options: 'i' } },
    ];
  }

  let usersQuery = User.find(filter).sort(sort).skip(skip).limit(limit);
  if (includeAdmin === 'true' || includeAdmin === '1') {
    usersQuery = usersQuery.populate('adminId', 'name email');
  }

  const [users, total] = await Promise.all([
    usersQuery,
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Users fetched', users, paginationMeta(total, page, limit));
});


export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('adminId', 'name email commissionRate');
  if (!user) return sendError(res, 404, 'User not found');

  if (user.role === ROLES.USER) {
    if (req.user.role === ROLES.USER && user._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized');
    }
    if (
      req.user.role !== ROLES.USER
      && req.user.role !== ROLES.SUPER_ADMIN
      && req.user.role !== ROLES.ADMIN
    ) {
      return sendError(res, 403, 'Not authorized');
    }
  }

  const profile = await Profile.findOne({ user: user._id });
  const loans = await Loan.find({ user: user._id, isDeleted: { $ne: true } }).sort('-createdAt');
  const emis = await EMI.find({ user: user._id, isDeleted: { $ne: true } }).sort('dueDate');
  const pendingEmis = emis.filter((e) => ['pending', 'overdue', 'partial', 'pending_collection'].includes(e.status));
  const overdueEmis = emis.filter((e) => e.status === 'overdue' || (e.penalty || 0) > 0);

  // Keep existing keys (user, profile, recentLoans) — add loans/emis/summary without breaking clients
  sendResponse(res, 200, 'User fetched', {
    user,
    profile,
    recentLoans: loans.slice(0, 5),
    loans,
    emis,
    summary: {
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => ['active', 'disbursed', 'approved'].includes(l.status)).length,
      pendingLoans: loans.filter((l) => ['pending', 'under_review'].includes(l.status)).length,
      totalEmis: emis.length,
      pendingEmis: pendingEmis.length,
      paidEmis: emis.filter((e) => e.status === 'paid').length,
      overdueEmis: overdueEmis.length,
      overdueEmiAmount: overdueEmis.reduce((sum, e) => sum + (e.penalty || 0), 0),
      pendingEmiAmount: pendingEmis.reduce((sum, e) => sum + (e.pendingAmount || e.amount || 0), 0),
      totalLoanAmount: loans.reduce((sum, l) => sum + (l.amount || 0), 0),
    },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const {
    name,
    credential, // New field
    password,
    role,
    phone,
    mobile, // Keep for backward compatibility
    adminId,
  } = req.body;

  let userEmail = null;
  let userMobile = null;

  // Handle credential field (priority)
  if (credential) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);
    const isMobile = /^\d{10}$/.test(credential);

    if (!isEmail && !isMobile) {
      return sendError(res, 400, 'Credential must be a valid email or mobile number');
    }

    if (isEmail) {
      userEmail = credential.toLowerCase();
    } else {
      userMobile = credential;
    }
  } else {
    // If no credential, use email/mobile from body (backward compatibility)
    if (req.body.email) {
      userEmail = req.body.email.toLowerCase();
    }
    if (mobile) {
      userMobile = mobile;
    }
  }

  // Validate that we have at least one credential
  if (!userEmail && !userMobile) {
    return sendError(res, 400, 'Email or mobile is required');
  }

  // Check for existing email
  if (userEmail) {
    const existingEmail = await User.findOne({ 
      email: userEmail, 
      isDeleted: { $ne: true } 
    });
    if (existingEmail) {
      return sendError(res, 400, 'Email already exists');
    }
  }

  // Check for existing mobile
  if (userMobile) {
    const existingMobile = await User.findOne({
      $or: [
        { mobile_number: userMobile },
        { mobile: userMobile } // Keep for backward compatibility
      ],
      isDeleted: { $ne: true },
    });
    if (existingMobile) {
      return sendError(res, 400, 'Mobile number already exists');
    }
  }

  // Role-based validation
  let userRole = role || ROLES.USER;

  if (req.user.role === ROLES.ADMIN) {
    if (userRole !== ROLES.USER) {
      return sendError(res, 403, 'Admins can only create User accounts. Super Admin creates Admins.');
    }
    userRole = ROLES.USER;
  }

  if (userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN) {
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      return sendError(res, 403, 'Only Super Admin can create Admin accounts');
    }
    if (userRole === ROLES.SUPER_ADMIN) {
      return sendError(res, 403, 'Cannot create another Super Admin');
    }
  }

  // Admin assignment logic
  let assignedAdminId = null;
  if (userRole === ROLES.USER) {
    if (req.user.role === ROLES.ADMIN) {
      if (adminId) {
        const selectedAdmin = await User.findOne({
          _id: adminId,
          role: ROLES.ADMIN,
          isActive: true,
          isDeleted: { $ne: true },
        }).select('_id');
        if (!selectedAdmin) {
          return sendError(res, 400, 'Selected Admin is invalid or inactive');
        }
        assignedAdminId = selectedAdmin._id;
      } else {
        assignedAdminId = req.user._id;
      }
    } else {
      assignedAdminId = resolveAdminId(req.user, adminId);
    }
  }

  if (userRole === ROLES.USER && req.user.role === ROLES.ADMIN && !assignedAdminId) {
    return sendError(res, 400, 'Admin ownership (adminId) could not be resolved');
  }

  if (userRole === ROLES.USER && req.user.role === ROLES.SUPER_ADMIN && adminId) {
    const owningAdmin = await User.findOne({
      _id: adminId,
      role: ROLES.ADMIN,
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (!owningAdmin) {
      return sendError(res, 400, 'Selected Admin is invalid or inactive');
    }
    assignedAdminId = adminId;
  }

  // Determine registration method
  let registrationMethod = 'email';
  if (userMobile && !userEmail) {
    registrationMethod = 'mobile';
  } else if (userMobile && userEmail) {
    registrationMethod = 'email'; // Default to email if both
  }

  // Create user
  const userData = {
    name,
    password,
    role: userRole,
    createdBy: req.user._id,
    registrationMethod,
    isEmailVerified: !!userEmail,
    isMobileVerified: !!userMobile,
  };

  // Only add adminId if assigned
  if (assignedAdminId) {
    userData.adminId = assignedAdminId;
  }

  // Only add email and mobile if they exist
  if (userEmail) userData.email = userEmail;
  if (userMobile) userData.mobile_number = userMobile;
  if (userRole === ROLES.ADMIN) {
    userData.commissionRate = req.body.commissionRate ?? 2;
  }

  const user = await User.create(userData);

  // Create profile
  await Profile.create({
    user: user._id,
    phone: phone || userMobile || '',
  });

  // Send notification to admin
  if (userRole === ROLES.USER && assignedAdminId) {
    const admin = await User.findById(assignedAdminId);
    if (admin) {
      await createNotification({
        user: admin._id,
        title: 'New User Created',
        message: `${name} was added under your account. Their loans will earn you commission.`,
        type: 'info',
      });
    }
  }

  // Audit log
  const credentialDisplay = userEmail || userMobile || 'Unknown';
  await createAuditLog({
    user: req.user._id,
    action: `Created ${userRole}: ${credentialDisplay}${assignedAdminId ? ` under admin ${assignedAdminId}` : ''}`,
    entity: 'user',
    entityId: user._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'User created', user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive, isSuspended, walletBalance, adminId } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, 'User not found');

  if (user.role === ROLES.USER) {
    if (req.user.role === ROLES.USER) {
      return sendError(res, 403, 'Not authorized');
    }
    if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.ADMIN) {
      return sendError(res, 403, 'Not authorized');
    }
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (role && req.user.role === ROLES.SUPER_ADMIN) user.role = role;
  if (adminId && req.user.role === ROLES.SUPER_ADMIN) user.adminId = adminId;
  if (isActive !== undefined) user.isActive = isActive;
  if (isSuspended !== undefined) user.isSuspended = isSuspended;
  if (walletBalance !== undefined) user.walletBalance = walletBalance;

  await user.save();

  await createAuditLog({
    user: req.user._id,
    action: `Updated user: ${user.email}`,
    entity: 'user',
    entityId: user._id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'User updated', user);
});

/**
 * @route   DELETE /api/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, 'User not found');

  if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
    return sendError(res, 400, 'Cannot delete admin user');
  }

  if (user.role === ROLES.USER) {
    if (req.user.role === ROLES.USER) {
      return sendError(res, 403, 'Not authorized');
    }
    if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.ADMIN) {
      return sendError(res, 403, 'Not authorized');
    }
  }

  await user.softDelete(req.user._id);
  const profile = await Profile.findOne({ user: req.params.id });
  if (profile) await profile.softDelete(req.user._id);

  await createAuditLog({
    user: req.user._id,
    action: `Deleted user: ${user.email}`,
    entity: 'user',
    entityId: user._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'User deleted');
});

/**
 * @route   GET /api/users/export/excel
 */
export const exportUsers = asyncHandler(async (req, res) => {
  const filter = { isDeleted: { $ne: true }, role: ROLES.USER };

  // Match getUsers: admin panel exports all end-users
  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.ADMIN) {
    Object.assign(filter, getAdminScopeFilter(req.user));
  }

  const users = await User.find(filter).sort('-createdAt');
  const buffer = await exportUsersExcel(users);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
  res.send(buffer);
});
