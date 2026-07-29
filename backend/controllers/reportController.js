import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Fund from '../models/Fund.js';
import RecoveryCase from '../models/RecoveryCase.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { buildDateRange } from '../utils/helpers.js';
import { exportTransactionsExcel, exportLoansExcel, exportUsersExcel } from '../utils/excelExport.js';

const getDateFilter = (query) => {
  const { period, startDate, endDate } = query;
  const { from, to } = buildDateRange(period || 'month', startDate, endDate);
  return { createdAt: { $gte: from, $lte: to } };
};

/**
 * @route   GET /api/reports/:type
 */
export const getAdvancedReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const dateFilter = getDateFilter(req.query);
  const format = req.query.format;

  let data;
  let exportBuffer;

  switch (type) {
    case 'daily_collection':
    case 'weekly_collection':
    case 'monthly_collection':
    case 'yearly_collection': {
      const periodMap = {
        daily_collection: 'today',
        weekly_collection: 'week',
        monthly_collection: 'month',
        yearly_collection: 'year',
      };
      const { from, to } = buildDateRange(periodMap[type]);
      data = await Transaction.find({
        type: { $in: ['emi_payment', 'emi_credit'] },
        createdAt: { $gte: from, $lte: to },
        isDeleted: { $ne: true },
      }).populate('user', 'name').sort('-createdAt');
      break;
    }
    case 'interest': {
      data = await EMI.find({
        status: 'paid',
        ...dateFilter,
        isDeleted: { $ne: true },
      }).populate('user', 'name').populate('loan', 'loanId');
      const totalInterest = data.reduce((s, e) => s + (e.interest || 0), 0);
      data = { emis: data, totalInterest };
      break;
    }
    case 'penalty': {
      data = await EMI.find({
        penalty: { $gt: 0 },
        ...dateFilter,
        isDeleted: { $ne: true },
      }).populate('user', 'name').populate('loan', 'loanId');
      break;
    }
    case 'processing_fee': {
      data = await Transaction.find({
        type: 'processing_fee',
        ...dateFilter,
        isDeleted: { $ne: true },
      }).populate('user', 'name').populate('loan', 'loanId');
      break;
    }
    case 'loans':
      data = await Loan.find({ ...dateFilter, isDeleted: { $ne: true } })
        .populate('user', 'name email').sort('-createdAt');
      if (format === 'excel') exportBuffer = await exportLoansExcel(data);
      break;
    case 'recovery':
      data = await RecoveryCase.find({ isDeleted: { $ne: true } })
        .populate('user', 'name mobile')
        .populate('assignedTo', 'name')
        .sort('-createdAt');
      break;
    case 'profit': {
      const fund = await Fund.findOne();
      data = {
        companyFund: fund?.companyFund || 0,
        interestEarned: fund?.interestEarned || 0,
        penaltyEarned: fund?.penaltyEarned || 0,
        processingFeeEarned: fund?.processingFeeEarned || 0,
        expenses: fund?.expenses || 0,
        netProfit: fund?.netProfit || fund?.profit || 0,
        loanDistributed: fund?.loanDistributed || 0,
        emiCollected: fund?.emiCollected || 0,
      };
      break;
    }
    case 'cashflow': {
      const txns = await Transaction.find({ ...dateFilter, isDeleted: { $ne: true } }).sort('-createdAt');
      const inflow = txns.filter((t) => ['emi_payment', 'processing_fee', 'credit'].includes(t.type))
        .reduce((s, t) => s + t.amount, 0);
      const outflow = txns.filter((t) => ['loan_disbursement', 'debit', 'refund'].includes(t.type))
        .reduce((s, t) => s + t.amount, 0);
      data = { transactions: txns, inflow, outflow, net: inflow - outflow };
      break;
    }
    case 'outstanding': {
      data = await Loan.find({
        status: { $in: ['active', 'disbursed'] },
        isDeleted: { $ne: true },
      }).populate('user', 'name mobile');
      const totalOutstanding = data.reduce((s, l) => s + (l.remainingBalance || 0), 0);
      data = { loans: data, totalOutstanding };
      break;
    }
    case 'expected_collection': {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      data = await EMI.find({
        status: 'pending',
        dueDate: { $lte: nextMonth },
        isDeleted: { $ne: true },
      }).populate('user', 'name').populate('loan', 'loanId');
      break;
    }
    case 'missed_emi':
      data = await EMI.find({
        status: { $in: ['overdue', 'pending'] },
        dueDate: { $lt: new Date() },
        isDeleted: { $ne: true },
      }).populate('user', 'name mobile').populate('loan', 'loanId');
      break;
    case 'transactions':
      data = await Transaction.find({ ...dateFilter, isDeleted: { $ne: true } })
        .populate('user', 'name email').sort('-createdAt');
      if (format === 'excel') exportBuffer = await exportTransactionsExcel(data);
      break;
    case 'users':
      data = await User.find({ role: 'user', isDeleted: { $ne: true }, ...dateFilter }).sort('-createdAt');
      if (format === 'excel') exportBuffer = await exportUsersExcel(data);
      break;
    default:
      return sendError(res, 400, 'Invalid report type');
  }

  if (format === 'excel' && exportBuffer) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);
    return res.send(exportBuffer);
  }

  if (format === 'csv' && Array.isArray(data)) {
    const headers = Object.keys(data[0] || {}).filter((k) => !k.startsWith('_'));
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    return res.send(csv);
  }

  sendResponse(res, 200, `${type} report`, data);
});
