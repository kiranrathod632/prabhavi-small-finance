import User from '../models/User.js';
import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import Transaction from '../models/Transaction.js';
import Fund from '../models/Fund.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { ROLES } from '../config/permissions.js';

/**
 * Get monthly data for charts (last 6 months)
 */
const getMonthlyData = async (model, matchField, sumField = null, months = 6) => {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const match = { createdAt: { $gte: start, $lte: end } };
    if (matchField) Object.assign(match, matchField);

    let value;
    if (sumField) {
      const result = await model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: `$${sumField}` } } },
      ]);
      value = result[0]?.total || 0;
    } else {
      value = await model.countDocuments(match);
    }

    data.push({
      month: start.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
};

/**
 * @route   GET /api/dashboard/admin
 * Super Admin: global stats (unchanged)
 * Admin: only stats for users joined under them (adminId)
 */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const isAdmin = req.user.role === ROLES.ADMIN;
  const adminId = req.user._id;

  const userScope = isAdmin
    ? { role: ROLES.USER, adminId, isDeleted: { $ne: true } }
    : { role: 'user', isDeleted: { $ne: true } };
  // Owned loans for most metrics; pending applications are visible to every admin
  const loanScope = isAdmin
    ? { adminId, isDeleted: { $ne: true } }
    : { isDeleted: { $ne: true } };
  const pendingLoanScope = isAdmin
    ? {
        isDeleted: { $ne: true },
        $or: [
          { adminId },
          { adminId: null },
          { adminId: { $exists: false } },
          { status: { $in: ['pending', 'under_review'] } },
        ],
      }
    : { isDeleted: { $ne: true } };

  let scopedUserIds = null;
  if (isAdmin) {
    const owned = await User.find(userScope).select('_id');
    scopedUserIds = owned.map((u) => u._id);
  }

  const emiUserMatch = scopedUserIds ? { user: { $in: scopedUserIds } } : {};
  const txnUserMatch = scopedUserIds ? { user: { $in: scopedUserIds } } : {};

  const [
    totalUsers,
    newUsersToday,
    totalLoans,
    activeLoans,
    closedLoans,
    pendingLoans,
    rejectedLoans,
    defaultLoans,
    todayEMI,
    weeklyEMI,
    monthlyCollection,
    yearlyCollection,
    fund,
    totalTransactions,
    pendingEmis,
    overdueEmis,
    todayInterest,
    weeklyInterest,
    monthlyInterest,
    yearlyInterest,
    todayProcessingFee,
    weeklyProcessingFee,
    monthlyProcessingFee,
    yearlyProcessingFee,
    todayPenalty,
    monthlyPenalty,
    yearlyPenalty,
    recentTransactions,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments(userScope),
    User.countDocuments({ ...userScope, createdAt: { $gte: today } }),
    Loan.countDocuments(loanScope),
    Loan.countDocuments({ ...loanScope, status: 'active' }),
    Loan.countDocuments({ ...loanScope, status: 'closed' }),
    Loan.countDocuments({ ...pendingLoanScope, status: { $in: ['pending', 'under_review'] } }),
    Loan.countDocuments({ ...loanScope, status: 'rejected' }),
    Loan.countDocuments({ ...loanScope, status: 'defaulted' }),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Fund.findOne(),
    Transaction.countDocuments({ ...txnUserMatch, isDeleted: { $ne: true } }),
    EMI.countDocuments({ ...emiUserMatch, status: 'pending', isDeleted: { $ne: true } }),
    EMI.countDocuments({ ...emiUserMatch, status: 'overdue', isDeleted: { $ne: true } }),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$interest' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$interest' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$interest' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$interest' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, penalty: { $gt: 0 }, paidDate: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$penalty' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, penalty: { $gt: 0 }, paidDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$penalty' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, penalty: { $gt: 0 }, paidDate: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$penalty' } } },
    ]),
    Transaction.find({ ...txnUserMatch, isDeleted: { $ne: true } }).populate('user', 'name').sort('-createdAt').limit(10),
    isAdmin
      ? AuditLog.find({ user: { $in: [...(scopedUserIds || []), adminId] } }).populate('user', 'name').sort('-createdAt').limit(10)
      : AuditLog.find().populate('user', 'name').sort('-createdAt').limit(10),
  ]);

  const monthlyUserMatch = isAdmin ? { role: ROLES.USER, adminId } : { role: 'user' };
  const monthlyLoanMatch = isAdmin ? { adminId } : null;
  const monthlyEmiMatch = scopedUserIds
    ? { status: 'paid', user: { $in: scopedUserIds } }
    : { status: 'paid' };

  const [monthlyLoans, monthlyEMI, userGrowth, loanRecovery] = await Promise.all([
    getMonthlyData(Loan, monthlyLoanMatch, 'amount'),
    getMonthlyData(EMI, monthlyEmiMatch, 'paidAmount'),
    getMonthlyData(User, monthlyUserMatch),
    getMonthlyData(EMI, monthlyEmiMatch, 'principal'),
  ]);

  sendResponse(res, 200, 'Admin dashboard data', {
    cards: {
      totalUsers,
      newCustomers: newUsersToday,
      totalLoans,
      activeLoans,
      closedLoans,
      pendingLoans,
      rejectedLoans,
      defaultLoans,
      pendingLoanRequests: pendingLoans,
      todayEMICollection: todayEMI[0]?.total || 0,
      weeklyCollection: weeklyEMI[0]?.total || 0,
      monthlyCollection: monthlyCollection[0]?.total || 0,
      yearlyCollection: yearlyCollection[0]?.total || 0,
      // EMI / Interest / Profit totals for quick dashboard filtering
      emiTotalToday: todayEMI[0]?.total || 0,
      emiTotalWeekly: weeklyEMI[0]?.total || 0,
      emiTotalMonthly: monthlyCollection[0]?.total || 0,
      emiTotalYearly: yearlyCollection[0]?.total || 0,

      interestTotalToday: todayInterest[0]?.total || 0,
      interestTotalWeekly: weeklyInterest[0]?.total || 0,
      interestTotalMonthly: monthlyInterest[0]?.total || 0,
      interestTotalYearly: yearlyInterest[0]?.total || 0,

      // Profit here follows the existing fund.profit logic: profit = interest + processing_fee (includes GST)
      profitTotalToday: (todayInterest[0]?.total || 0) + (todayProcessingFee[0]?.total || 0),
      profitTotalWeekly: (weeklyInterest[0]?.total || 0) + (weeklyProcessingFee[0]?.total || 0),
      profitTotalMonthly: (monthlyInterest[0]?.total || 0) + (monthlyProcessingFee[0]?.total || 0),
      profitTotalYearly: (yearlyInterest[0]?.total || 0) + (yearlyProcessingFee[0]?.total || 0),

      companyFund: fund?.companyFund || 0,
      availableFund: fund?.availableFund || 0,
      totalFundAvailable: fund?.availableFund || 0,
      totalLoanDistributed: fund?.loanDistributed || 0,
      loanDistributed: fund?.loanDistributed || 0,
      emiCollected: fund?.emiCollected || 0,
      totalInterestEarned: fund?.interestEarned || 0,
      todayInterest: todayInterest[0]?.total || 0,
      weeklyInterest: todayInterest[0]?.total || 0,
      monthlyInterest: monthlyInterest[0]?.total || 0,
      yearlyInterest: yearlyInterest[0]?.total || 0,
      totalProcessingFees: fund?.processingFeeEarned || 0,
      todayProcessingFees: todayProcessingFee[0]?.total || 0,
      monthlyProcessingFees: monthlyProcessingFee[0]?.total || 0,
      penaltyCollected: fund?.penaltyEarned || 0,
      todayPenalty: todayPenalty[0]?.total || 0,
      monthlyPenalty: monthlyPenalty[0]?.total || 0,
      yearlyPenalty: yearlyPenalty[0]?.total || 0,
      pendingEmi: pendingEmis,
      overdueEmi: overdueEmis,
      expenses: fund?.expenses || 0,
      profit: fund?.profit || 0,
      netProfit: fund?.netProfit || fund?.profit || 0,
      cashInHand: fund?.cashInHand || 0,
      bankBalance: fund?.bankBalance || 0,
      totalTransactions,
    },
    charts: {
      monthlyLoans,
      monthlyEMI,
      userGrowth,
      loanRecovery,
    },
    recentTransactions,
    recentAuditLogs,
  });
});

/**
 * @route   GET /api/dashboard/user
 */
export const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    loans,
    paidEmis,
    pendingEmis,
    totalTransactions,
    user,
    upcomingEMI,
    recentTransactions,
  ] = await Promise.all([
    Loan.find({ user: userId, status: { $in: ['active', 'disbursed'] } }),
    EMI.countDocuments({ user: userId, status: 'paid' }),
    EMI.countDocuments({ user: userId, status: { $in: ['pending', 'overdue'] } }),
    Transaction.countDocuments({ user: userId }),
    User.findById(userId),
    EMI.findOne({ user: userId, status: 'pending' }).populate('loan', 'loanId').sort('dueDate'),
    Transaction.find({ user: userId }).sort('-createdAt').limit(10),
  ]);

  const totalLoan = loans.reduce((sum, l) => sum + l.amount, 0);
  const remainingLoan = loans.reduce((sum, l) => sum + l.remainingBalance, 0);

  const monthlyEMIPaid = await getMonthlyData(
    EMI,
    { user: userId, status: 'paid' },
    'paidAmount',
    6
  );

  const loanProgress = loans.map((l) => ({
    loanId: l.loanId,
    type: l.loanType,
    total: l.totalPayable,
    paid: l.paidAmount,
    remaining: l.remainingBalance,
    progress: l.totalPayable > 0 ? Math.round((l.paidAmount / l.totalPayable) * 100) : 0,
  }));

  sendResponse(res, 200, 'User dashboard data', {
    cards: {
      totalLoan,
      remainingLoan,
      paidEmi: paidEmis,
      pendingEmi: pendingEmis,
      totalTransactions,
      walletBalance: user?.walletBalance || 0,
    },
    upcomingEMI,
    recentTransactions,
    charts: {
      monthlyEMIPaid,
      loanProgress,
    },
  });
});

/**
 * @route   GET /api/dashboard/reports/:type
 */
export const getReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  let data;
  switch (type) {
    case 'loans':
      data = await Loan.find(dateFilter).populate('user', 'name email').sort('-createdAt');
      break;
    case 'emis':
      data = await EMI.find(dateFilter).populate('user', 'name').populate('loan', 'loanId').sort('-dueDate');
      break;
    case 'transactions':
      data = await Transaction.find(dateFilter).populate('user', 'name email').sort('-createdAt');
      break;
    case 'users':
      data = await User.find({ role: 'user', ...dateFilter }).sort('-createdAt');
      break;
    case 'profit': {
      const fund = await Fund.findOne();
      data = {
        companyFund: fund?.companyFund || 0,
        loanDistributed: fund?.loanDistributed || 0,
        emiCollected: fund?.emiCollected || 0,
        expenses: fund?.expenses || 0,
        profit: fund?.profit || 0,
        availableFund: fund?.availableFund || 0,
      };
      break;
    }
    default:
      return sendError(res, 400, 'Invalid report type');
  }

  sendResponse(res, 200, `${type} report`, data);
});
