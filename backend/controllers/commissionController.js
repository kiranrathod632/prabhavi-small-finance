import Commission from '../models/Commission.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { ROLES } from '../config/permissions.js';
import { createAuditLog } from '../services/auditService.js';
import { createCommissionForLoan, getCommissionReport } from '../services/commissionService.js';

/**
 * GET /api/admin/commissions
 * Admin sees own commissions; Super Admin sees all (optional adminId filter)
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

  const [rows, total] = await Promise.all([
    Commission.find(filter)
      .populate('admin', 'name email commissionRate')
      .populate('user', 'name email mobile')
      .populate('loan', 'loanId amount status')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Commission.countDocuments(filter),
  ]);

  const summary = await Commission.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCommission: { $sum: '$commissionAmount' },
        totalLoanAmount: { $sum: '$loanAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  sendResponse(res, 200, 'Commissions fetched', {
    commissions: rows,
    summary: summary[0] || { totalCommission: 0, totalLoanAmount: 0, count: 0 },
  }, paginationMeta(total, page, limit));
});

/**
 * PUT /api/admin/commission-rate
 * Admin updates their own commission %
 * Super Admin can update any admin via body.adminId
 */
export const updateCommissionRate = asyncHandler(async (req, res) => {
  const rate = parseFloat(req.body.commissionRate);
  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    return sendError(res, 400, 'Commission rate must be between 0 and 100');
  }

  let admin;
  if (req.user.role === ROLES.SUPER_ADMIN && req.body.adminId) {
    admin = await User.findOne({ _id: req.body.adminId, role: ROLES.ADMIN, isDeleted: { $ne: true } });
  } else if (req.user.role === ROLES.ADMIN) {
    admin = await User.findById(req.user._id);
  } else {
    return sendError(res, 403, 'Only Admin or Super Admin can update commission rate');
  }

  if (!admin) return sendError(res, 404, 'Admin not found');

  admin.commissionRate = rate;
  await admin.save();

  await createAuditLog({
    user: req.user._id,
    action: `Updated commission rate to ${rate}% for ${admin.email}`,
    entity: 'admin',
    entityId: admin._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Commission rate updated', {
    adminId: admin._id,
    email: admin.email,
    commissionRate: admin.commissionRate,
  });
});

export { createCommissionForLoan, getCommissionReport };
