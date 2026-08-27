import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { generateTransactionStatement } from '../utils/pdfGenerator.js';
import { exportTransactionsExcel } from '../utils/excelExport.js';

/**
 * Build date filter from query params
 */
const buildDateFilter = (query) => {
  const { filter, startDate, endDate } = query;
  const now = new Date();
  let dateFilter = {};

  switch (filter) {
    case 'today':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
      };
      break;
    case 'week': {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
      break;
    }
    case 'month': {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
      break;
    }
    case 'custom':
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      }
      break;
  }

  return dateFilter;
};

/**
 * @route   GET /api/transactions
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { type, status, search, sort = '-createdAt' } = req.query;

  const filter = { ...buildDateFilter(req.query) };
  if (req.user.role !== 'admin') filter.user = req.user._id;
  if (req.query.userId && req.user.role === 'admin') filter.user = req.query.userId;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('user', 'name email')
      .populate('loan', 'loanId')
      .populate('processedBy', 'name') 
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Transactions fetched', transactions, paginationMeta(total, page, limit));
});

/**
 * @route   GET /api/transactions/:id
 */
export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('user', 'name email')
    .populate('loan', 'loanId loanType')
    .populate('emi')
     .populate('processedBy', 'name email');

  if (!transaction) return sendError(res, 404, 'Transaction not found');
  sendResponse(res, 200, 'Transaction fetched', transaction);
});

/**
 * @route   POST /api/transactions
 */
export const createTransaction = asyncHandler(async (req, res) => {
  const { userId, type, amount, description, paymentMethod } = req.body;
  const targetUserId = req.user.role === 'admin' && userId ? userId : req.user._id;

  const user = await User.findById(targetUserId);
  if (!user) return sendError(res, 404, 'User not found');

  const balanceBefore = user.walletBalance;
  let balanceAfter = balanceBefore;

  if (type === 'credit' || type === 'refund' || type === 'loan_disbursement') {
    balanceAfter = balanceBefore + amount;
    user.walletBalance = balanceAfter;
  } else if (type === 'debit' || type === 'penalty') {
    if (balanceBefore < amount) return sendError(res, 400, 'Insufficient balance');
    balanceAfter = balanceBefore - amount;
    user.walletBalance = balanceAfter;
  }

  await user.save();

  const transaction = await Transaction.create({
    user: targetUserId,
    type,
    amount,
    description: description || `${type} transaction`,
    balanceBefore,
    balanceAfter,
    paymentMethod: paymentMethod || 'wallet',
  });

  await createAuditLog({
    user: req.user._id,
    action: `Transaction created: ${type} - ₹${amount}`,
    entity: 'transaction',
    entityId: transaction._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'Transaction created', transaction);
});

/**
 * @route   GET /api/transactions/statement/pdf
 */
export const downloadStatement = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, ...buildDateFilter(req.query) };
  const transactions = await Transaction.find(filter).sort('-createdAt');
  const user = await User.findById(req.user._id);

  const dateRange = req.query.startDate
    ? { from: req.query.startDate, to: req.query.endDate }
    : null;

  const buffer = await generateTransactionStatement(transactions, user, dateRange);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=transaction-statement.pdf');
  res.send(buffer);
});

/**
 * @route   GET /api/transactions/export/excel
 */
export const exportTransactions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin') filter.user = req.user._id;
  Object.assign(filter, buildDateFilter(req.query));

  const transactions = await Transaction.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt');

  const buffer = await exportTransactionsExcel(transactions);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
  res.send(buffer);
});
