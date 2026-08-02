import User from '../models/User.js';
import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import Transaction from '../models/Transaction.js';
import Fund from '../models/Fund.js';
import AuditLog from '../models/AuditLog.js';
import Purchase from '../models/Purchase.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { ROLES } from '../config/permissions.js';

/**
 * Get monthly data for charts (last N months)
 */
const getMonthlyData = async (model, matchField, sumField = null, months = 6, dateField = 'createdAt') => {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const match = { [dateField]: { $gte: start, $lte: end } };
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
 * Daily buckets for last N days
 */
const getDailyData = async (model, matchField, sumField, days = 7, dateField = 'createdAt') => {
  const data = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const match = { [dateField]: { $gte: start, $lte: end } };
    if (matchField) Object.assign(match, matchField);

    let value = 0;
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
      month: start.toLocaleString('en-US', { weekday: 'short', day: 'numeric' }),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
};

/**
 * Weekly buckets for last N weeks
 */
const getWeeklyData = async (model, matchField, sumField, weeks = 4, dateField = 'createdAt') => {
  const data = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const match = { [dateField]: { $gte: start, $lte: end } };
    if (matchField) Object.assign(match, matchField);

    let value = 0;
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
      month: `${start.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`,
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
};

const sumSeries = async (builders) => {
  const seriesList = await Promise.all(builders);
  if (!seriesList.length) return [];
  return seriesList[0].map((point, idx) => ({
    month: point.month,
    value: Math.round(
      seriesList.reduce((sum, series) => sum + (Number(series[idx]?.value) || 0), 0) * 100
    ) / 100,
  }));
};

const buildPeriodCharts = async (emiMatch, txnMatch, userMatch, loanMatch) => {
  const emiPaid = { ...emiMatch, status: 'paid' };
  const feeMatch = { ...txnMatch, type: 'processing_fee' };
  const penaltyMatch = { ...emiMatch, status: 'paid', penalty: { $gt: 0 } };
  const loanDisbursedMatch = { ...(loanMatch || {}), disbursedAt: { $exists: true, $ne: null } };
  const usersMatch = userMatch || { role: 'user' };

  const [
    emiWeek, emiMonth, emi3, emi6, emiYear,
    interestWeek, interestMonth, interest3, interest6, interestYear,
    feeWeek, feeMonth, fee3, fee6, feeYear,
    usersWeek, usersMonth, users3, users6, usersYear,
    loansWeek, loansMonth, loans3, loans6, loansYear,
    penaltyWeek, penaltyMonth, penalty3, penalty6, penaltyYear,
  ] = await Promise.all([
    getDailyData(EMI, emiPaid, 'paidAmount', 7, 'paidDate'),
    getWeeklyData(EMI, emiPaid, 'paidAmount', 4, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'paidAmount', 3, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'paidAmount', 6, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'paidAmount', 12, 'paidDate'),
    getDailyData(EMI, emiPaid, 'interest', 7, 'paidDate'),
    getWeeklyData(EMI, emiPaid, 'interest', 4, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'interest', 3, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'interest', 6, 'paidDate'),
    getMonthlyData(EMI, emiPaid, 'interest', 12, 'paidDate'),
    getDailyData(Transaction, feeMatch, 'amount', 7, 'createdAt'),
    getWeeklyData(Transaction, feeMatch, 'amount', 4, 'createdAt'),
    getMonthlyData(Transaction, feeMatch, 'amount', 3, 'createdAt'),
    getMonthlyData(Transaction, feeMatch, 'amount', 6, 'createdAt'),
    getMonthlyData(Transaction, feeMatch, 'amount', 12, 'createdAt'),
    getDailyData(User, usersMatch, null, 7, 'createdAt'),
    getWeeklyData(User, usersMatch, null, 4, 'createdAt'),
    getMonthlyData(User, usersMatch, null, 3, 'createdAt'),
    getMonthlyData(User, usersMatch, null, 6, 'createdAt'),
    getMonthlyData(User, usersMatch, null, 12, 'createdAt'),
    getDailyData(Loan, loanDisbursedMatch, 'disbursedAmount', 7, 'disbursedAt'),
    getWeeklyData(Loan, loanDisbursedMatch, 'disbursedAmount', 4, 'disbursedAt'),
    getMonthlyData(Loan, loanDisbursedMatch, 'disbursedAmount', 3, 'disbursedAt'),
    getMonthlyData(Loan, loanDisbursedMatch, 'disbursedAmount', 6, 'disbursedAt'),
    getMonthlyData(Loan, loanDisbursedMatch, 'disbursedAmount', 12, 'disbursedAt'),
    getDailyData(EMI, penaltyMatch, 'penalty', 7, 'paidDate'),
    getWeeklyData(EMI, penaltyMatch, 'penalty', 4, 'paidDate'),
    getMonthlyData(EMI, penaltyMatch, 'penalty', 3, 'paidDate'),
    getMonthlyData(EMI, penaltyMatch, 'penalty', 6, 'paidDate'),
    getMonthlyData(EMI, penaltyMatch, 'penalty', 12, 'paidDate'),
  ]);

  const profitWeek = await sumSeries([Promise.resolve(interestWeek), Promise.resolve(feeWeek)]);
  const profitMonth = await sumSeries([Promise.resolve(interestMonth), Promise.resolve(feeMonth)]);
  const profit3 = await sumSeries([Promise.resolve(interest3), Promise.resolve(fee3)]);
  const profit6 = await sumSeries([Promise.resolve(interest6), Promise.resolve(fee6)]);
  const profitYear = await sumSeries([Promise.resolve(interestYear), Promise.resolve(feeYear)]);

  return {
    emi: { week: emiWeek, month: emiMonth, month3: emi3, month6: emi6, year: emiYear },
    interest: {
      week: interestWeek,
      month: interestMonth,
      month3: interest3,
      month6: interest6,
      year: interestYear,
    },
    profit: {
      week: profitWeek,
      month: profitMonth,
      month3: profit3,
      month6: profit6,
      year: profitYear,
    },
    users: {
      week: usersWeek,
      month: usersMonth,
      month3: users3,
      month6: users6,
      year: usersYear,
    },
    loansDisbursed: {
      week: loansWeek,
      month: loansMonth,
      month3: loans3,
      month6: loans6,
      year: loansYear,
    },
    penalty: {
      week: penaltyWeek,
      month: penaltyMonth,
      month3: penalty3,
      month6: penalty6,
      year: penaltyYear,
    },
  };
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
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
  threeMonthsAgo.setHours(0, 0, 0, 0);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
  sixMonthsAgo.setHours(0, 0, 0, 0);

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
    threeMonthCollection,
    sixMonthCollection,
    yearlyCollection,
    fund,
    totalTransactions,
    pendingEmis,
    overdueEmis,
    todayInterest,
    weeklyInterest,
    monthlyInterest,
    threeMonthInterest,
    sixMonthInterest,
    yearlyInterest,
    todayProcessingFee,
    weeklyProcessingFee,
    monthlyProcessingFee,
    threeMonthProcessingFee,
    sixMonthProcessingFee,
    yearlyProcessingFee,
    todayPenalty,
    weeklyPenalty,
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
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: threeMonthsAgo } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: sixMonthsAgo } } },
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
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: threeMonthsAgo } } },
      { $group: { _id: null, total: { $sum: '$interest' } } },
    ]),
    EMI.aggregate([
      { $match: { ...emiUserMatch, status: 'paid', paidDate: { $gte: sixMonthsAgo } } },
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
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: threeMonthsAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txnUserMatch, type: 'processing_fee', createdAt: { $gte: sixMonthsAgo } } },
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
      { $match: { ...emiUserMatch, penalty: { $gt: 0 }, paidDate: { $gte: weekAgo } } },
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

  const monthlyUserMatch = isAdmin ? { role: ROLES.USER, adminId, isDeleted: { $ne: true } } : { role: 'user', isDeleted: { $ne: true } };
  const monthlyLoanMatch = isAdmin ? { adminId, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };
  const monthlyEmiMatch = scopedUserIds
    ? { status: 'paid', user: { $in: scopedUserIds } }
    : { status: 'paid' };

  const loanDisburseBase = {
    ...monthlyLoanMatch,
    disbursedAt: { $exists: true, $ne: null },
  };

  const [
    monthlyLoans,
    monthlyEMI,
    userGrowth,
    loanRecovery,
    periodCharts,
    usersRegisteredWeekly,
    usersRegisteredMonthly,
    usersRegisteredYearly,
    loanDisbursedToday,
    loanDisbursedWeekly,
    loanDisbursedMonthly,
    loanDisbursedYearly,
  ] = await Promise.all([
    getMonthlyData(Loan, monthlyLoanMatch, 'amount'),
    getMonthlyData(EMI, monthlyEmiMatch, 'paidAmount'),
    getMonthlyData(User, monthlyUserMatch),
    getMonthlyData(EMI, monthlyEmiMatch, 'principal'),
    buildPeriodCharts(emiUserMatch, txnUserMatch, monthlyUserMatch, monthlyLoanMatch),
    User.countDocuments({ ...userScope, createdAt: { $gte: weekAgo } }),
    User.countDocuments({ ...userScope, createdAt: { $gte: monthStart } }),
    User.countDocuments({ ...userScope, createdAt: { $gte: yearStart } }),
    Loan.aggregate([
      { $match: { ...loanDisburseBase, disbursedAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$disbursedAmount', '$amount'] } } } },
    ]),
    Loan.aggregate([
      { $match: { ...loanDisburseBase, disbursedAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$disbursedAmount', '$amount'] } } } },
    ]),
    Loan.aggregate([
      { $match: { ...loanDisburseBase, disbursedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$disbursedAmount', '$amount'] } } } },
    ]),
    Loan.aggregate([
      { $match: { ...loanDisburseBase, disbursedAt: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$disbursedAmount', '$amount'] } } } },
    ]),
  ]);

  const purchaseMatch = isAdmin ? { requestedBy: adminId } : {};
  const [approvedPurchases, pendingPurchaseAgg, pendingPurchases, adminList] = await Promise.all([
    Purchase.aggregate([
      { $match: { ...purchaseMatch, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: { ...purchaseMatch, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Purchase.find({ status: 'pending', ...(isAdmin ? { requestedBy: adminId } : {}) })
      .populate('requestedBy', 'name email firstName lastName')
      .sort('-createdAt')
      .limit(8),
    !isAdmin
      ? User.find({ role: ROLES.ADMIN, isDeleted: { $ne: true } })
          .select('name email mobile firstName lastName isActive createdAt')
          .sort('name')
          .limit(20)
          .lean()
      : Promise.resolve([]),
  ]);

  const purchaseStats = {
    approvedTotal: approvedPurchases[0]?.total || 0,
    approvedCount: approvedPurchases[0]?.count || 0,
    pendingTotal: pendingPurchaseAgg[0]?.total || 0,
    pendingCount: pendingPurchaseAgg[0]?.count || 0,
  };

  // Lifetime interest from paid EMIs (fund.interestEarned was historically not updated)
  const lifetimeInterestAgg = await EMI.aggregate([
    { $match: { ...emiUserMatch, status: 'paid', isDeleted: { $ne: true } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$interest', 0] } } } },
  ]);
  const paidInterestTotal = lifetimeInterestAgg[0]?.total || 0;
  const fundInterest = fund?.interestEarned || 0;

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
      emiTotal3Month: threeMonthCollection[0]?.total || 0,
      emiTotal6Month: sixMonthCollection[0]?.total || 0,
      emiTotalYearly: yearlyCollection[0]?.total || 0,

      interestTotalToday: todayInterest[0]?.total || 0,
      interestTotalWeekly: weeklyInterest[0]?.total || 0,
      interestTotalMonthly: monthlyInterest[0]?.total || 0,
      interestTotal3Month: threeMonthInterest[0]?.total || 0,
      interestTotal6Month: sixMonthInterest[0]?.total || 0,
      interestTotalYearly: yearlyInterest[0]?.total || 0,

      // Profit here follows the existing fund.profit logic: profit = interest + processing_fee (includes GST)
      profitTotalToday: (todayInterest[0]?.total || 0) + (todayProcessingFee[0]?.total || 0),
      profitTotalWeekly: (weeklyInterest[0]?.total || 0) + (weeklyProcessingFee[0]?.total || 0),
      profitTotalMonthly: (monthlyInterest[0]?.total || 0) + (monthlyProcessingFee[0]?.total || 0),
      profitTotal3Month: (threeMonthInterest[0]?.total || 0) + (threeMonthProcessingFee[0]?.total || 0),
      profitTotal6Month: (sixMonthInterest[0]?.total || 0) + (sixMonthProcessingFee[0]?.total || 0),
      profitTotalYearly: (yearlyInterest[0]?.total || 0) + (yearlyProcessingFee[0]?.total || 0),

      companyFund: fund?.companyFund || 0,
      availableFund: fund?.availableFund || 0,
      totalFundAvailable: fund?.availableFund || 0,
      totalLoanDistributed: fund?.loanDistributed || 0,
      loanDistributed: fund?.loanDistributed || 0,
      emiCollected: fund?.emiCollected || 0,
      totalInterestEarned: Math.max(fundInterest, paidInterestTotal),
      todayInterest: todayInterest[0]?.total || 0,
      weeklyInterest: todayInterest[0]?.total || 0,
      monthlyInterest: monthlyInterest[0]?.total || 0,
      yearlyInterest: yearlyInterest[0]?.total || 0,
      totalProcessingFees: fund?.processingFeeEarned || 0,
      todayProcessingFees: todayProcessingFee[0]?.total || 0,
      weeklyProcessingFees: weeklyProcessingFee[0]?.total || 0,
      monthlyProcessingFees: monthlyProcessingFee[0]?.total || 0,
      processingFeeTotalToday: todayProcessingFee[0]?.total || 0,
      processingFeeTotalWeekly: weeklyProcessingFee[0]?.total || 0,
      processingFeeTotalMonthly: monthlyProcessingFee[0]?.total || 0,
      penaltyCollected: fund?.penaltyEarned || 0,
      todayPenalty: todayPenalty[0]?.total || 0,
      weeklyPenalty: weeklyPenalty[0]?.total || 0,
      monthlyPenalty: monthlyPenalty[0]?.total || 0,
      yearlyPenalty: yearlyPenalty[0]?.total || 0,
      // Additive: users registered + loans disbursed by period
      usersRegisteredToday: newUsersToday,
      usersRegisteredWeekly,
      usersRegisteredMonthly,
      usersRegisteredYearly,
      loanDisbursedToday: loanDisbursedToday[0]?.total || 0,
      loanDisbursedWeekly: loanDisbursedWeekly[0]?.total || 0,
      loanDisbursedMonthly: loanDisbursedMonthly[0]?.total || 0,
      loanDisbursedYearly: loanDisbursedYearly[0]?.total || 0,
      penaltyTotalToday: todayPenalty[0]?.total || 0,
      penaltyTotalWeekly: weeklyPenalty[0]?.total || 0,
      penaltyTotalMonthly: monthlyPenalty[0]?.total || 0,
      penaltyTotalYearly: yearlyPenalty[0]?.total || 0,
      pendingEmi: pendingEmis,
      overdueEmi: overdueEmis,
      expenses: fund?.expenses || 0,
      profit: fund?.profit || 0,
      netProfit: fund?.netProfit || fund?.profit || 0,
      cashInHand: fund?.cashInHand || 0,
      bankBalance: fund?.bankBalance || 0,
      totalTransactions,
      purchaseApprovedTotal: purchaseStats.approvedTotal,
      purchaseApprovedCount: purchaseStats.approvedCount,
      purchasePendingTotal: purchaseStats.pendingTotal,
      purchasePendingCount: purchaseStats.pendingCount,
    },
    charts: {
      monthlyLoans,
      monthlyEMI,
      userGrowth,
      loanRecovery,
      // Additive period graphs (does not replace existing chart keys)
      periodCharts,
    },
    recentTransactions,
    recentAuditLogs,
    admins: adminList,
    pendingPurchases,
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
