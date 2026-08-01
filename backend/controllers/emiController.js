import EMI from '../models/EMI.js';
import Loan from '../models/Loan.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import Fund from '../models/Fund.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta, isStaffRole } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { notifyEMIUpdate, createNotification } from '../services/notificationService.js';
import { sendEMIPaymentEmail } from '../services/emailService.js';
import { generateEMIReceipt } from '../utils/pdfGenerator.js';
import { getAdminScopeFilter, canAccessAdminScope } from '../middlewares/scope.js';
import { ROLES } from '../config/permissions.js';
import { sendEmiPaidSms, sendEmiPaymentRequestAdminSms } from '../services/smsService.js';


const buildEmiFilter = async (user, query = {}) => {
  const filter = { isDeleted: { $ne: true } };
  if (query.status) filter.status = query.status;
  if (query.loanId) filter.loan = query.loanId;
  if (query.userId) filter.user = query.userId;

  if (!isStaffRole(user.role)) {
    filter.user = user._id;
    return filter;
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    const scope = getAdminScopeFilter(user);
    const scopedLoans = await Loan.find({ ...scope, isDeleted: { $ne: true } }).select('_id');
    filter.loan = { $in: scopedLoans.map((l) => l._id) };
  }

  return filter;
};


export const getEMIs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { sort = 'dueDate' } = req.query;

  const filter = await buildEmiFilter(req.user, req.query);

  const [emis, total] = await Promise.all([
    EMI.find(filter)
      .populate('loan', 'loanId loanType amount adminId')
      .populate('user', 'name email mobile')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    EMI.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'EMIs fetched', emis, paginationMeta(total, page, limit));
});


export const getEMI = asyncHandler(async (req, res) => {
  const emi = await EMI.findById(req.params.id)
    .populate('loan', 'loanId loanType amount interestRate')
    .populate('user', 'name email');

  if (!emi) return sendError(res, 404, 'EMI not found');
  sendResponse(res, 200, 'EMI fetched', emi);
});


export const payEMI = asyncHandler(async (req, res) => {
  const { emiId, paymentMethod = 'wallet' } = req.body;

  const emi = await EMI.findById(emiId).populate('loan');
  if (!emi) return sendError(res, 404, 'EMI not found');

  if (req.user.role !== 'admin' && req.user.role !== ROLES.SUPER_ADMIN
    && emi.user.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not authorized');
  }

  if (isStaffRole(req.user.role) && req.user.role !== ROLES.SUPER_ADMIN) {
    const loan = await Loan.findById(emi.loan._id || emi.loan);
    if (loan?.adminId && !canAccessAdminScope(req.user, loan.adminId)) {
      return sendError(res, 403, 'Not authorized');
    }
  }

  if (emi.status === 'paid') return sendError(res, 400, 'EMI already paid');
  if (emi.status === 'pending_collection') {
    return sendError(res, 400, 'EMI payment already requested. Waiting for admin collection');
  }

  const totalAmount = (emi.amount || 0) + (emi.penalty || 0) + (emi.lateFee || 0) + (emi.dailyPenalty || 0);
  const user = await User.findById(emi.user);

  // Borrower pay = request only. Admin collect marks EMI paid.
  if (!isStaffRole(req.user.role)) {
    const loan = await Loan.findById(emi.loan._id || emi.loan);

    emi.status = 'pending_collection';
    emi.paymentMethod = paymentMethod;
    await emi.save();

    await createNotification({
      user: emi.user,
      title: 'EMI Payment Requested',
      message: `Your EMI #${emi.emiNumber} payment of ₹${totalAmount} is awaiting admin collection.`,
      type: 'emi',
      link: '/emis',
      metadata: { emiNumber: emi.emiNumber, loanId: loan?.loanId, amount: String(totalAmount) },
    });

    const recipientIds = new Set();
    if (loan?.adminId) recipientIds.add(loan.adminId.toString());
    if (user?.adminId) recipientIds.add(user.adminId.toString());

    const superAdmins = await User.find({
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      isDeleted: { $ne: true },
    }).select('_id');
    superAdmins.forEach((sa) => recipientIds.add(sa._id.toString()));

    if (recipientIds.size) {
      const staffRecipients = await User.find({
        _id: { $in: [...recipientIds] },
        isActive: true,
        isDeleted: { $ne: true },
      }).select('_id mobile_number mobile role');

      const accountLabel = user?.mobile_number || user?.mobile || user?.email || 'N/A';
      for (const staff of staffRecipients) {
        await createNotification({
          user: staff._id,
          title: 'EMI Payment Request',
          message: `${user?.name || 'User'} (Account: ${accountLabel}) paid/requested EMI #${emi.emiNumber} of ₹${totalAmount}. Loan: ${loan?.loanId || 'N/A'}. Please collect to mark paid.`,
          type: 'payment',
          link: staff.role === ROLES.SUPER_ADMIN ? '/super-admin/emis' : '/admin/emis',
          metadata: {
            emiId: emi._id.toString(),
            emiNumber: String(emi.emiNumber),
            loanId: loan?.loanId || '',
            userId: user?._id?.toString?.() || '',
            amount: String(totalAmount),
          },
        });

        const adminMobile = staff.mobile_number || staff.mobile;
        if (adminMobile) {
          await sendEmiPaymentRequestAdminSms({
            adminMobile,
            user,
            emi,
            loan,
            amount: totalAmount,
          });
        }
      }
    }

    await createAuditLog({
      user: req.user._id,
      action: `EMI payment requested: #${emi.emiNumber} - ${loan?.loanId || ''} - ₹${totalAmount}`,
      entity: 'emi',
      entityId: emi._id,
      ipAddress: req.ip,
    });

    // Same response envelope; settlement happens on admin collect
    return sendResponse(res, 200, 'EMI payment request submitted. Admin will collect shortly.', {
      payment: null,
      emi,
      transaction: null,
    });
  }

  // if (paymentMethod === 'wallet' && user.walletBalance < totalAmount) {
  //   return sendError(res, 400, 'Insufficient wallet balance');
  // }

  // Deduct from wallet
  const balanceBefore = user.walletBalance;
  if (paymentMethod === 'wallet') {
    user.walletBalance -= totalAmount;
    await user.save();
  }

  // Create payment record
  const payment = await Payment.create({
    user: emi.user,
    loan: emi.loan._id,
    emi: emi._id,
    amount: totalAmount,
    type: emi.penalty > 0 ? 'penalty' : 'emi',
    method: paymentMethod,
    status: 'completed',
  });

  // Create transaction
  const transaction = await Transaction.create({
    user: emi.user,
    type: 'emi_payment',
    amount: totalAmount,
    description: `EMI #${emi.emiNumber} payment - ${emi.loan.loanId}`,
    loan: emi.loan._id,
    emi: emi._id,
    payment: payment._id,
    balanceBefore,
    balanceAfter: user.walletBalance,
    paymentMethod,
  });

  payment.transaction = transaction._id;
  await payment.save();

  // Update EMI
  emi.status = 'paid';
  emi.paidDate = new Date();
  emi.paidAmount = totalAmount;
  emi.payment = payment._id;
  emi.receiptNumber = payment.receiptNumber;
  await emi.save();

  // Update loan
  const loan = await Loan.findById(emi.loan._id);
  loan.paidAmount += totalAmount;
  loan.remainingBalance = Math.max(0, loan.remainingBalance - emi.principal);
  loan.paidEmis += 1;
  if (loan.paidEmis >= loan.totalEmis) {
    loan.status = 'closed';
    loan.closedAt = new Date();
  }
  await loan.save();

  // Update fund
  const fund = await Fund.findOne();
  if (fund) {
    fund.emiCollected += totalAmount;
    fund.availableFund += totalAmount;
    fund.profit += emi.interest;
    fund.history.push({ type: 'emi_collection', amount: totalAmount, description: `EMI ${emi.emiNumber} - ${loan.loanId}` });
    await fund.save();
  }

  await notifyEMIUpdate(emi.user, emi, loan, 'paid');
  await sendEMIPaymentEmail(user, payment, emi, loan);

  await createAuditLog({
    user: req.user._id,
    action: `EMI paid: #${emi.emiNumber} - ${loan.loanId}`,
    entity: 'emi',
    entityId: emi._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'EMI paid successfully', { payment, emi, transaction });
});


export const updateEMI = asyncHandler(async (req, res) => {
  const emi = await EMI.findById(req.params.id);
  if (!emi) return sendError(res, 404, 'EMI not found');

  const { status, penalty, remarks } = req.body;

  if (status === 'paid' && isStaffRole(req.user.role)) {
    emi.status = 'paid';
    emi.paidDate = new Date();
    emi.paidAmount = emi.amount + (emi.penalty || 0);
  }
  if (penalty !== undefined) emi.penalty = penalty;
  if (remarks) emi.remarks = remarks;

  await emi.save();

  await createAuditLog({
    user: req.user._id,
    action: `EMI updated: #${emi.emiNumber}`,
    entity: 'emi',
    entityId: emi._id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'EMI updated', emi);
});


export const downloadReceipt = asyncHandler(async (req, res) => {
  const emi = await EMI.findById(req.params.id).populate('loan').populate('user', 'name email');
  if (!emi) return sendError(res, 404, 'EMI not found');

  if (emi.status !== 'paid') return sendError(res, 400, 'EMI not paid yet');

  const payment = await Payment.findById(emi.payment);
  if (!payment) return sendError(res, 404, 'Payment not found');

  const buffer = await generateEMIReceipt(payment, emi, emi.loan, emi.user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber}.pdf`);
  res.send(buffer);
});


export const createEMI = asyncHandler(async (req, res) => {
  const emi = await EMI.create(req.body);

  await createAuditLog({
    user: req.user._id,
    action: `EMI created: #${emi.emiNumber}`,
    entity: 'emi',
    entityId: emi._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'EMI created', emi);
});


export const adminCollectEMI = asyncHandler(async (req, res) => {
  const { paymentMethod = 'cash', referenceNumber, remarks } = req.body;

  const emi = await EMI.findById(req.params.id).populate('loan');
  if (!emi) return sendError(res, 404, 'EMI not found');

  const loan = emi.loan;
  if (loan?.adminId && !canAccessAdminScope(req.user, loan.adminId) && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Not authorized');
  }

  if (emi.status === 'paid') return sendError(res, 400, 'EMI already paid');

  const totalAmount = (emi.amount || 0) + (emi.penalty || 0) + (emi.lateFee || 0) + (emi.dailyPenalty || 0);
  const user = await User.findById(emi.user);

  const payment = await Payment.create({
    user: emi.user,
    loan: loan._id,
    emi: emi._id,
    amount: totalAmount,
    type: emi.penalty > 0 ? 'penalty' : 'emi',
    method: paymentMethod,
    status: 'completed',
    referenceNumber,
  });

  const transaction = await Transaction.create({
    user: emi.user,
    type: 'emi_payment',
    amount: totalAmount,
    description: `EMI #${emi.emiNumber} collected by admin - ${loan.loanId}`,
    loan: loan._id,
    emi: emi._id,
    payment: payment._id,
    paymentMethod,
    processedBy: req.user._id,
  });

  payment.transaction = transaction._id;
  await payment.save();

  emi.status = 'paid';
  emi.paidDate = new Date();
  emi.paidAmount = totalAmount;
  emi.pendingAmount = 0;
  emi.payment = payment._id;
  emi.receiptNumber = payment.receiptNumber;
  emi.paymentMethod = paymentMethod;
  if (remarks) emi.remarks = remarks;
  await emi.save();

  loan.paidAmount = (loan.paidAmount || 0) + totalAmount;
  loan.remainingBalance = Math.max(0, (loan.remainingBalance || 0) - (emi.principal || 0));
  loan.paidEmis = (loan.paidEmis || 0) + 1;
  if (loan.paidEmis >= loan.totalEmis) {
    loan.status = 'closed';
    loan.closedAt = new Date();
  }
  await loan.save();

  const fund = await Fund.findOne();
  if (fund) {
    fund.emiCollected = (fund.emiCollected || 0) + totalAmount;
    fund.availableFund = (fund.availableFund || 0) + totalAmount;
    fund.profit = (fund.profit || 0) + (emi.interest || 0);
    fund.history.push({ type: 'emi_collection', amount: totalAmount, description: `Admin collected EMI ${emi.emiNumber} - ${loan.loanId}` });
    await fund.save();
  }

  await notifyEMIUpdate(emi.user, emi, loan, 'paid');
  if (user?.email) await sendEMIPaymentEmail(user, payment, emi, loan);
  if (user?.mobile) await sendEmiPaidSms(user.mobile, emi.emiNumber, totalAmount);

  await createAuditLog({
    user: req.user._id,
    action: `Admin collected EMI: #${emi.emiNumber} - ${loan.loanId}`,
    entity: 'emi',
    entityId: emi._id,
    details: { paymentMethod, amount: totalAmount },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'EMI collected successfully', { payment, emi, transaction });
});


export const adminPartialPayEMI = asyncHandler(async (req, res) => {
  const { amount, paymentMethod = 'cash', referenceNumber, remarks } = req.body;
  const payAmount = parseFloat(amount);

  if (!payAmount || payAmount <= 0) return sendError(res, 400, 'Valid payment amount is required');

  const emi = await EMI.findById(req.params.id).populate('loan');
  if (!emi) return sendError(res, 404, 'EMI not found');

  const loan = emi.loan;
  if (loan?.adminId && !canAccessAdminScope(req.user, loan.adminId) && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Not authorized');
  }

  if (emi.status === 'paid') return sendError(res, 400, 'EMI already fully paid');

  const totalDue = (emi.amount || 0) + (emi.penalty || 0) + (emi.lateFee || 0) + (emi.dailyPenalty || 0);
  const newPaid = (emi.paidAmount || 0) + payAmount;

  if (newPaid >= totalDue) {
    req.body.paymentMethod = paymentMethod;
    req.body.referenceNumber = referenceNumber;
    req.body.remarks = remarks;
    emi.paidAmount = newPaid - payAmount;
    await emi.save();
    // Delegate to full collection
    const collectReq = { ...req, params: { id: req.params.id }, body: { paymentMethod, referenceNumber, remarks } };
    return adminCollectEMI(collectReq, res);
  }

  emi.paidAmount = newPaid;
  emi.pendingAmount = totalDue - newPaid;
  emi.status = 'partial';
  emi.paymentMethod = paymentMethod;
  if (remarks) emi.remarks = remarks;
  await emi.save();

  await Payment.create({
    user: emi.user,
    loan: loan._id,
    emi: emi._id,
    amount: payAmount,
    type: 'emi',
    method: paymentMethod,
    status: 'completed',
    referenceNumber,
  });

  await Transaction.create({
    user: emi.user,
    type: 'emi_payment',
    amount: payAmount,
    description: `Partial EMI #${emi.emiNumber} - ${loan.loanId}`,
    loan: loan._id,
    emi: emi._id,
    paymentMethod,
    processedBy: req.user._id,
  });

  await createAuditLog({
    user: req.user._id,
    action: `Partial EMI payment: #${emi.emiNumber} - ₹${payAmount}`,
    entity: 'emi',
    entityId: emi._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Partial payment recorded', emi);
});


export const adminAddPenalty = asyncHandler(async (req, res) => {
  const { penalty, lateFee, remarks } = req.body;

  const emi = await EMI.findById(req.params.id).populate('loan');
  if (!emi) return sendError(res, 404, 'EMI not found');

  if (emi.loan?.adminId && !canAccessAdminScope(req.user, emi.loan.adminId) && req.user.role !== ROLES.SUPER_ADMIN) {
    return sendError(res, 403, 'Not authorized');
  }

  if (penalty !== undefined) emi.penalty = Number(penalty) || 0;
  if (lateFee !== undefined) emi.lateFee = Number(lateFee) || 0;
  if (remarks) emi.remarks = remarks;
  emi.penaltyAppliedAt = new Date();
  await emi.save();

  await createAuditLog({
    user: req.user._id,
    action: `Penalty added to EMI #${emi.emiNumber}`,
    entity: 'emi',
    entityId: emi._id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Penalty updated', emi);
});
