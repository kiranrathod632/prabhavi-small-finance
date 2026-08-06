import Commission from '../models/Commission.js';
import User from '../models/User.js';
import InterestSettings from '../models/InterestSettings.js';
import mongoose from 'mongoose';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { ROLES } from '../config/permissions.js';
import { createAuditLog } from '../services/auditService.js';
import { createCommissionForLoan, getCommissionReport } from '../services/commissionService.js';
import { getSettings, clearSettingsCache } from '../services/settingsService.js';

/**
 * GET /api/admin/commissions
 * Admin sees own commissions; Super Admin sees all (optional adminId filter)
 * Also returns per-admin totals (Super Admin) and lock status.
 */
export const listCommissions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const filter = { isDeleted: { $ne: true } };

  if (req.user.role === ROLES.ADMIN) {
    filter.admin = req.user._id;
  } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.adminId) {
    filter.admin = req.query.adminId;
  } else if (req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Not authorized');
  }

  if (req.query.status) filter.status = req.query.status;

  const settings = await getSettings();

  const matchForAgg = { ...filter };
  // Convert ObjectId string filters for aggregate $match
  if (matchForAgg.admin) {
    matchForAgg.admin = new mongoose.Types.ObjectId(String(matchForAgg.admin));
  }

  const [rows, total, summaryAgg, adminTotalsAgg] = await Promise.all([
    Commission.find(filter)
      .populate('admin', 'name email commissionRate')
      .populate('user', 'name email mobile')
      .populate('loan', 'loanId amount status')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Commission.countDocuments(filter),
    Commission.aggregate([
      { $match: matchForAgg },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commissionAmount' },
          totalLoanAmount: { $sum: '$loanAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
    // Per-admin totals — Super Admin sees all admins; Admin sees only self
    Commission.aggregate([
      {
        $match: req.user.role === ROLES.SUPER_ADMIN && !req.query.adminId
          ? { isDeleted: { $ne: true } }
          : matchForAgg,
      },
      {
        $group: {
          _id: '$admin',
          totalCommission: { $sum: '$commissionAmount' },
          totalLoanAmount: { $sum: '$loanAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'adminDoc',
        },
      },
      { $unwind: { path: '$adminDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          adminId: '$_id',
          name: { $ifNull: ['$adminDoc.name', 'N/A'] },
          email: { $ifNull: ['$adminDoc.email', ''] },
          commissionRate: { $ifNull: ['$adminDoc.commissionRate', settings.adminCommissionRate ?? 2] },
          totalCommission: 1,
          totalLoanAmount: 1,
          count: 1,
        },
      },
    ]),
  ]);

  sendResponse(res, 200, 'Commissions fetched', {
    commissions: rows,
    summary: summaryAgg[0] || { totalCommission: 0, totalLoanAmount: 0, count: 0 },
    adminTotals: adminTotalsAgg,
    commissionRate: settings.adminCommissionRate ?? 2,
    commissionRateLocked: !!settings.adminCommissionRateLocked,
  }, paginationMeta(total, page, limit));
});

/**
 * PUT /api/admin/commission-rate
 * Super Admin only.
 * - { unlock: true } → unlock rate so it can be changed
 * - { commissionRate } → set rate (blocked if locked), then auto-lock
 * - optional adminId → single admin override (also blocked if locked)
 */
export const updateCommissionRate = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Only Super Admin can set commission rate');
  }

  let settings = await InterestSettings.findOne({ isActive: true });
  if (!settings) settings = await InterestSettings.create({});

  // Unlock only — does not change the rate
  if (req.body.unlock === true) {
    settings.adminCommissionRateLocked = false;
    settings.updatedBy = req.user._id;
    await settings.save();
    clearSettingsCache();

    await createAuditLog({
      user: req.user._id,
      action: 'Unlocked admin commission rate',
      entity: 'system',
      ipAddress: req.ip,
    });

    return sendResponse(res, 200, 'Commission rate unlocked', {
      commissionRate: settings.adminCommissionRate ?? 2,
      commissionRateLocked: false,
    });
  }

  if (settings.adminCommissionRateLocked) {
    return sendError(res, 400, 'Commission rate is locked. Unlock to change it.');
  }

  const rate = parseFloat(req.body.commissionRate);
  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    return sendError(res, 400, 'Commission rate must be between 0 and 100');
  }

  // Single admin override
  if (req.body.adminId) {
    const admin = await User.findOne({
      _id: req.body.adminId,
      role: ROLES.ADMIN,
      isDeleted: { $ne: true },
    });
    if (!admin) return sendError(res, 404, 'Admin not found');

    admin.commissionRate = rate;
    await admin.save();

    settings.adminCommissionRateLocked = true;
    settings.updatedBy = req.user._id;
    await settings.save();
    clearSettingsCache();

    await createAuditLog({
      user: req.user._id,
      action: `Updated commission rate to ${rate}% for ${admin.email}`,
      entity: 'admin',
      entityId: admin._id,
      ipAddress: req.ip,
    });

    return sendResponse(res, 200, 'Commission rate updated', {
      adminId: admin._id,
      email: admin.email,
      commissionRate: admin.commissionRate,
      commissionRateLocked: true,
    });
  }

  // Global rate — settings + sync all admins, then lock
  settings.adminCommissionRate = rate;
  settings.adminCommissionRateLocked = true;
  settings.updatedBy = req.user._id;
  await settings.save();
  clearSettingsCache();

  const result = await User.updateMany(
    { role: ROLES.ADMIN, isDeleted: { $ne: true } },
    { $set: { commissionRate: rate } }
  );

  await createAuditLog({
    user: req.user._id,
    action: `Set global admin commission rate to ${rate}% (locked)`,
    entity: 'system',
    details: { commissionRate: rate, updatedAdmins: result.modifiedCount },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Commission rate updated for all admins', {
    commissionRate: rate,
    updatedCount: result.modifiedCount,
    commissionRateLocked: true,
  });
});

export { createCommissionForLoan, getCommissionReport };
