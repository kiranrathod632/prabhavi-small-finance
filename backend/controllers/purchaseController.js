import Purchase from '../models/Purchase.js';
import Fund from '../models/Fund.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { ROLES } from '../config/permissions.js';

/**
 * GET /api/admin/purchases
 * Admin: own requests | Super Admin: all (optional status / adminId filter)
 */
export const getPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { status } = req.query;
  const filter = {};

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }

  if (req.user.role === ROLES.ADMIN) {
    filter.requestedBy = req.user._id;
  } else if (req.query.adminId) {
    filter.requestedBy = req.query.adminId;
  }

  const [purchases, total, expenseAgg, pendingAgg] = await Promise.all([
    Purchase.find(filter)
      .populate('requestedBy', 'name email mobile firstName lastName')
      .populate('reviewedBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Purchase.countDocuments(filter),
    Purchase.aggregate([
      {
        $match: {
          status: 'approved',
          ...(req.user.role === ROLES.ADMIN ? { requestedBy: req.user._id } : {}),
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      {
        $match: {
          status: 'pending',
          ...(req.user.role === ROLES.ADMIN ? { requestedBy: req.user._id } : {}),
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  sendResponse(res, 200, 'Purchases fetched', {
    purchases,
    summary: {
      approvedTotal: expenseAgg[0]?.total || 0,
      approvedCount: expenseAgg[0]?.count || 0,
      pendingTotal: pendingAgg[0]?.total || 0,
      pendingCount: pendingAgg[0]?.count || 0,
    },
  }, paginationMeta(total, page, limit));
});

/**
 * POST /api/admin/purchases
 * Admin only — create a purchase request (pending — no fund deduct yet)
 * Super Admin cannot create purchases; only approve / reject
 */
export const createPurchase = asyncHandler(async (req, res) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Super Admin cannot create purchases. Only approve or reject admin requests.');
  }

  const { itemName, description, amount, purchaseDate } = req.body;
  const parsedAmount = parseFloat(amount);

  if (!itemName?.trim()) return sendError(res, 400, 'Item / what was purchased is required');
  if (!parsedAmount || parsedAmount <= 0) return sendError(res, 400, 'Valid amount is required');

  const billPhoto = req.file
    ? `/uploads/bills/${req.file.filename}`
    : '';

  const purchase = await Purchase.create({
    itemName: itemName.trim(),
    description: (description || '').trim(),
    amount: parsedAmount,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    billPhoto,
    status: 'pending',
    requestedBy: req.user._id,
  });

  await purchase.populate('requestedBy', 'name email mobile firstName lastName');

  await createAuditLog({
    user: req.user._id,
    action: `Purchase request: ${itemName} ₹${parsedAmount}`,
    entity: 'purchase',
    entityId: purchase._id,
    details: { amount: parsedAmount, itemName },
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'Purchase request submitted for approval', purchase);
});

/**
 * PUT /api/admin/purchases/:id/approve
 * Super Admin only — deduct from fund after approval
 */
export const approvePurchase = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Only Super Admin can approve purchases');
  }

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return sendError(res, 404, 'Purchase not found');
  if (purchase.status !== 'pending') {
    return sendError(res, 400, `Purchase is already ${purchase.status}`);
  }

  let fund = await Fund.findOne();
  if (!fund) {
    fund = await Fund.create({
      companyFund: 0,
      availableFund: 0,
    });
  }

  if (fund.availableFund < purchase.amount) {
    return sendError(res, 400, 'Insufficient available funds to approve this purchase');
  }

  fund.availableFund -= purchase.amount;
  fund.expenses += purchase.amount;
  fund.history.push({
    type: 'expense',
    amount: purchase.amount,
    description: `Purchase approved: ${purchase.itemName}`,
    performedBy: req.user._id,
    date: new Date(),
  });
  fund.lastUpdated = new Date();
  await fund.save();

  const historyEntry = fund.history[fund.history.length - 1];

  purchase.status = 'approved';
  purchase.reviewedBy = req.user._id;
  purchase.reviewedAt = new Date();
  purchase.reviewNote = (req.body.reviewNote || '').trim();
  purchase.fundHistoryId = historyEntry?._id || null;
  await purchase.save();

  await purchase.populate([
    { path: 'requestedBy', select: 'name email mobile firstName lastName' },
    { path: 'reviewedBy', select: 'name email' },
  ]);

  await createAuditLog({
    user: req.user._id,
    action: `Purchase approved: ${purchase.itemName} ₹${purchase.amount}`,
    entity: 'purchase',
    entityId: purchase._id,
    details: { amount: purchase.amount },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Purchase approved and amount deducted from fund', purchase);
});

/**
 * PUT /api/admin/purchases/:id/reject
 * Super Admin only — no fund deduction
 */
export const rejectPurchase = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Only Super Admin can reject purchases');
  }

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return sendError(res, 404, 'Purchase not found');
  if (purchase.status !== 'pending') {
    return sendError(res, 400, `Purchase is already ${purchase.status}`);
  }

  purchase.status = 'rejected';
  purchase.reviewedBy = req.user._id;
  purchase.reviewedAt = new Date();
  purchase.reviewNote = (req.body.reviewNote || '').trim();
  await purchase.save();

  await purchase.populate([
    { path: 'requestedBy', select: 'name email mobile firstName lastName' },
    { path: 'reviewedBy', select: 'name email' },
  ]);

  await createAuditLog({
    user: req.user._id,
    action: `Purchase rejected: ${purchase.itemName} ₹${purchase.amount}`,
    entity: 'purchase',
    entityId: purchase._id,
    details: { amount: purchase.amount, note: purchase.reviewNote },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Purchase rejected', purchase);
});

/**
 * GET /api/admin/purchases/summary
 * Totals for dashboard
 */
export const getPurchaseSummary = asyncHandler(async (req, res) => {
  const match =
    req.user.role === ROLES.ADMIN
      ? { requestedBy: req.user._id }
      : {};

  const [approved, pending] = await Promise.all([
    Purchase.aggregate([
      { $match: { ...match, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: { ...match, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  let admins = [];
  if (req.user.role === ROLES.SUPER_ADMIN) {
    admins = await User.find({ role: ROLES.ADMIN, isDeleted: { $ne: true } })
      .select('name email mobile firstName lastName isActive createdAt')
      .sort('name')
      .limit(50)
      .lean();
  }

  sendResponse(res, 200, 'Purchase summary', {
    approvedTotal: approved[0]?.total || 0,
    approvedCount: approved[0]?.count || 0,
    pendingTotal: pending[0]?.total || 0,
    pendingCount: pending[0]?.count || 0,
    admins,
  });
});
