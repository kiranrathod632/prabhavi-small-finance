import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import User from '../models/User.js';
import Fund from '../models/Fund.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta, isStaffRole } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { notifyLoanUpdate } from '../services/notificationService.js';
import { sendLoanStatusEmail } from '../services/emailService.js';
import { generateLoanStatement } from '../utils/pdfGenerator.js';
import { exportLoansExcel } from '../utils/excelExport.js';
import { getInterestRateForLoanType, getSettings } from '../services/settingsService.js';
import { addTimelineEvent, getLoanTimeline } from '../services/timelineService.js';
import { selectTenure, disburseLoan, previewEmiPlan } from '../services/loanService.js';
import { sendLoanStatusSms, sendSms } from '../services/smsService.js';
import {
  getLoanScopeFilter,
  canAccessAdminScope,
  backfillLoanAdminIds,
  resolveAdminId,
} from '../middlewares/scope.js';
import { createCommissionForLoan } from '../services/commissionService.js';
import { ROLES } from '../config/permissions.js';
import { createNotification } from '../services/notificationService.js';

/**
 * @route   POST /api/loans
 */
// controllers/loanController.js
export const createLoan = asyncHandler(async (req, res) => {
  const { loanType, amount, purpose, status: reqStatus } = req.body;
  const userId = isStaffRole(req.user.role) && req.body.userId ? req.body.userId : req.user._id;

  const loanUser = await User.findById(userId);
  if (!loanUser) return sendError(res, 404, 'User not found');

  const settings = await getSettings();
  if (amount < settings.minLoanAmount || amount > settings.maxLoanAmount) {
    return sendError(res, 400, `Loan amount must be between ₹${settings.minLoanAmount} and ₹${settings.maxLoanAmount}`);
  }

  const interestRate = req.body.interestRate || await getInterestRateForLoanType(loanType);
  const initialStatus = reqStatus === 'draft' ? 'draft' : 'pending';

  // ✅ Define adminId
  const adminId = loanUser.adminId || null;

  const loan = await Loan.create({
    user: userId,
    adminId: adminId,
    loanType,
    amount,
    interestRate,
    interestType: settings.interestType,
    interestRatePeriod: settings.interestRatePeriod,
    purpose,
    status: initialStatus,
  });

  if (initialStatus === 'pending') {
    await addTimelineEvent({
      loan, 
      user: userId, 
      status: 'pending',
      title: 'Application Submitted',
      description: `Loan application for ₹${amount} submitted`,
      performedBy: req.user._id,
    });

    await notifyLoanUpdate(userId, loan, 'pending');
    const applicantMobile = loanUser.mobile_number || loanUser.mobile;
    if (applicantMobile) {
      await sendLoanStatusSms(applicantMobile, loan.loanId, 'pending');
    }

    // Notify all active admins + super admins so applications are not missed
    const staffRecipients = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      isActive: true,
      isDeleted: { $ne: true },
    }).select('_id mobile_number mobile');

    const notified = new Set();
    for (const staff of staffRecipients) {
      const id = staff._id.toString();
      if (notified.has(id)) continue;
      notified.add(id);
      await createNotification({
        user: staff._id,
        title: 'New Loan Application',
        message: `${loanUser.name} applied for a loan of ₹${amount}.`,
        type: 'info',
        link: `/admin/loans/${loan._id}`,
      });

      const adminMobile = staff.mobile_number || staff.mobile;
      if (adminMobile) {
        await sendSms({
          to: adminMobile,
          message: `New loan application: ${loanUser.name} applied for Rs.${amount}. Loan ID: ${loan.loanId}.`,
        });
      }
    }
  }

  await createAuditLog({
    user: req.user._id,
    action: `Loan application submitted: ${loan.loanId}`,
    entity: 'loan',
    entityId: loan._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'Loan application submitted', loan);
});

/**
 * @route   GET /api/loans
 */
export const getLoans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const { status, loanType, search, sort = '-createdAt' } = req.query;

  // Heal orphan loans that belong to a user with an adminId
  if (isStaffRole(req.user.role)) {
    await backfillLoanAdminIds(Loan);
  }

  const scopeFilter = await getLoanScopeFilter(req.user);
  const andConditions = [{ isDeleted: { $ne: true } }];

  if (Object.keys(scopeFilter).length) {
    andConditions.push(scopeFilter);
  }

  if (!isStaffRole(req.user.role)) {
    andConditions.push({ user: req.user._id });
  }
  if (req.query.userId && isStaffRole(req.user.role)) {
    andConditions.push({ user: req.query.userId });
  }
  if (status) andConditions.push({ status });
  if (loanType) andConditions.push({ loanType });
  if (search) {
    andConditions.push({
      $or: [
        { loanId: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
      ],
    });
  }

  const filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

  const [loans, total] = await Promise.all([
    Loan.find(filter).populate('user', 'name email').sort(sort).skip(skip).limit(limit),
    Loan.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Loans fetched', loans, paginationMeta(total, page, limit));
});

/**
 * @route   GET /api/loans/:id
 */
export const getLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id).populate('user', 'name email avatar');
  if (!loan) return sendError(res, 404, 'Loan not found');

  if (!isStaffRole(req.user.role) && loan.user._id.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not authorized');
  }

  if (isStaffRole(req.user.role) && req.user.role !== ROLES.SUPER_ADMIN && loan.adminId) {
    if (!canAccessAdminScope(req.user, loan.adminId, loan.status)) {
      return sendError(res, 403, 'Not authorized');
    }
  }

  const emis = await EMI.find({ loan: loan._id, isDeleted: { $ne: true } }).sort('emiNumber');
  const timeline = await getLoanTimeline(loan._id);
  const settings = await getSettings();
  const feeBreakup = loan.processingFee ? {
    loanAmount: loan.amount,
    processingFee: loan.processingFee,
    gstAmount: loan.gstAmount,
    netDisbursed: loan.netDisbursedAmount,
  } : null;

  sendResponse(res, 200, 'Loan fetched', { loan, emis, timeline, feeBreakup, allowedTenures: settings.allowedTenures });
});

/**
 * @route   PUT /api/loans/:id
 */
// export const updateLoan = asyncHandler(async (req, res) => {
//   const loan = await Loan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
//   if (!loan) return sendError(res, 404, 'Loan not found');

//   const { status, interestRate, processingFee, gstAmount, rejectedReason, remarks, approvedAmount, tenure, emiStartDate, dueDate } = req.body;
//   const staff = isStaffRole(req.user.role);

//   if (staff && req.user.role !== ROLES.SUPER_ADMIN && loan.adminId && !canAccessAdminScope(req.user, loan.adminId)) {
//     return sendError(res, 403, 'Not authorized');
//   }

//   if (status === 'under_review' && staff) {
//     loan.status = 'under_review';
//     loan.reviewedBy = req.user._id;
//     loan.reviewedAt = new Date();
//     await addTimelineEvent({ loan, user: loan.user, status, performedBy: req.user._id });
//   } else if (status === 'approved' && staff) {
//     loan.status = 'approved';
//     loan.approvedBy = req.user._id;
//     loan.approvedAt = new Date();
//     if (interestRate) loan.interestRate = interestRate;
//     if (approvedAmount) loan.approvedAmount = Number(approvedAmount);
//     if (tenure) loan.tenure = Number(tenure);
//     if (emiStartDate) loan.emiStartDate = new Date(emiStartDate);
//     if (dueDate) loan.dueDate = new Date(dueDate);
//     if (processingFee !== undefined && processingFee !== null) {
//       loan.processingFee = Number(processingFee) || 0;
//     }
//     if (gstAmount !== undefined && gstAmount !== null) {
//       loan.gstAmount = Number(gstAmount) || 0;
//     }
//     const baseAmount = loan.approvedAmount || loan.amount;
//     loan.netDisbursedAmount = Math.max(0, baseAmount - (loan.processingFee || 0) - (loan.gstAmount || 0));
//     await addTimelineEvent({ loan, user: loan.user, status, performedBy: req.user._id });
//     await loan.save();
//     await createCommissionForLoan(loan);
//   } else if (status === 'rejected' && staff) {
//     loan.status = 'rejected';
//     loan.rejectedReason = rejectedReason || 'Application rejected';
//     loan.rejectedBy = req.user._id;
//     loan.rejectedAt = new Date();
//     await addTimelineEvent({ loan, user: loan.user, status, description: rejectedReason, performedBy: req.user._id });
//   } else if (status === 'disbursed' && staff) {
//     try {
//       await disburseLoan(loan, req.user._id);
//     } catch (err) {
//       return sendError(res, 400, err.message);
//     }
//   } else if (status === 'closed' && staff) {
//     loan.status = 'closed';
//     loan.closedAt = new Date();
//     await addTimelineEvent({ loan, user: loan.user, status: 'closed', performedBy: req.user._id });
//     await loan.save();
//   } else if (status === 'cancelled' && staff) {
//     loan.status = 'cancelled';
//     loan.cancelledAt = new Date();
//     loan.cancelledReason = rejectedReason || 'Cancelled';
//     await addTimelineEvent({ loan, user: loan.user, status: 'cancelled', performedBy: req.user._id });
//     await loan.save();
//   } else if (interestRate && staff) {
//     loan.interestRate = interestRate;
//     await loan.save();
//   }

//   if (remarks) { loan.remarks = remarks; await loan.save(); }

//   if (status && status !== 'disbursed') {
//     await notifyLoanUpdate(loan.user, loan, status);
//     const user = await User.findById(loan.user);
//     if (user?.email) await sendLoanStatusEmail(user, loan, status);
//     if (user?.mobile) await sendLoanStatusSms(user.mobile, loan.loanId, status);
//   }

//   await createAuditLog({
//     user: req.user._id,
//     action: `Loan updated: ${loan.loanId} - ${status || 'details'}`,
//     entity: 'loan',
//     entityId: loan._id,
//     details: req.body,
//     ipAddress: req.ip,
//   });

//   const updated = await Loan.findById(loan._id);
//   sendResponse(res, 200, 'Loan updated', updated);
// });

// controllers/loanController.js - updateLoan function

// controllers/loanController.js - updateLoan function

export const updateLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!loan) return sendError(res, 404, 'Loan not found');

  const { status, interestRate, processingFee, gstAmount, rejectedReason, remarks, approvedAmount, tenure, emiStartDate, dueDate } = req.body;
  const staff = isStaffRole(req.user.role);

  if (staff && req.user.role !== ROLES.SUPER_ADMIN && loan.adminId && !canAccessAdminScope(req.user, loan.adminId, loan.status)) {
    return sendError(res, 403, 'Not authorized');
  }

  // Claim orphan loans under the acting admin
  if (staff && !loan.adminId) {
    const claimed = resolveAdminId(req.user);
    if (claimed) loan.adminId = claimed;
  }

  if (status === 'under_review' && staff) {
    loan.status = 'under_review';
    loan.reviewedBy = req.user._id;
    loan.reviewedAt = new Date();
    await addTimelineEvent({ loan, user: loan.user, status, performedBy: req.user._id });
    await loan.save();
    
  } else if (status === 'approved' && staff) {
    // ✅ APPROVED = DIRECTLY ACTIVE/DISBURSED
    
    // 1. Update loan details
    if (interestRate) loan.interestRate = parseFloat(interestRate);
    if (approvedAmount) loan.approvedAmount = Number(approvedAmount);
    if (tenure) loan.tenure = Number(tenure);
    if (emiStartDate) loan.emiStartDate = new Date(emiStartDate);
    if (dueDate) loan.dueDate = new Date(dueDate);
    
    // 2. Processing fee & GST
    if (processingFee !== undefined && processingFee !== null) {
      loan.processingFee = Number(processingFee) || 0;
    }
    if (gstAmount !== undefined && gstAmount !== null) {
      loan.gstAmount = Number(gstAmount) || 0;
    }
    
    // 3. Calculate net disbursed amount
    const baseAmount = loan.approvedAmount || loan.amount;
    const netDisbursed = Math.max(0, baseAmount - (loan.processingFee || 0) - (loan.gstAmount || 0));
    loan.netDisbursedAmount = netDisbursed;
    loan.disbursedAmount = netDisbursed;
    
    // 4. Calculate EMI if tenure is provided
    if (loan.tenure && loan.interestRate) {
      const emi = calculateEMI(loan.amount, loan.interestRate, loan.tenure);
      loan.emiAmount = emi;
      loan.totalPayable = emi * loan.tenure;
      loan.totalInterest = loan.totalPayable - loan.amount;
      loan.totalEmis = loan.tenure;
      loan.remainingBalance = loan.totalPayable;
      loan.totalOutstanding = loan.totalPayable;
    }
    
    // 5. Set loan as active/disbursed
    loan.status = 'active';
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.disbursedAt = new Date();
    loan.disbursedBy = req.user._id;
    loan.startDate = new Date();
    loan.processingFeeDeductedAt = new Date();
    
    // Set end date
    if (loan.tenure) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + loan.tenure);
      loan.endDate = endDate;
    }
    
    // 6. Save loan first
    await loan.save();
    
    // 7. ✅ UPDATE FUND - Deduct disbursed amount from fund
    try {
      await updateFundForDisbursement(loan, req.user._id, netDisbursed);
    } catch (error) {
      // Revert loan status if fund update fails
      loan.status = 'approved';
      await loan.save();
      return sendError(res, 400, error.message);
    }
    
    // 8. ✅ CREDIT USER WALLET - Add net disbursed amount to user's wallet
    try {
      await creditUserWallet(loan, netDisbursed, req.user._id);
    } catch (error) {
      // Log error but don't fail the whole process
      console.error('Failed to credit wallet:', error);
    }
    
    // 9. Generate EMIs
    if (loan.tenure && loan.emiAmount) {
      await generateEMIs(loan);
    }
    
    // 10. Add timeline events
    await addTimelineEvent({ 
      loan, 
      user: loan.user, 
      status: 'approved', 
      title: 'Loan Approved & Disbursed',
      description: `Loan approved for ₹${baseAmount}. Net disbursed: ₹${netDisbursed} credited to wallet`,
      performedBy: req.user._id 
    });
    
    await addTimelineEvent({ 
      loan, 
      user: loan.user, 
      status: 'active', 
      title: 'Loan Active',
      description: `EMI of ₹${loan.emiAmount || 0} for ${loan.tenure || 0} months`,
      performedBy: req.user._id 
    });
    
    // 11. Create commission
    await createCommissionForLoan(loan);
    
    // 12. Send notifications
    await notifyLoanUpdate(loan.user, loan, 'active');
    const user = await User.findById(loan.user);
    const userMobile = user?.mobile_number || user?.mobile;
    if (user?.email) await sendLoanStatusEmail(user, loan, 'active');
    if (userMobile) await sendLoanStatusSms(userMobile, loan.loanId, 'approved');
    
    await createNotification({
      user: loan.user,
      title: 'Loan Approved & Disbursed',
      message: `Your loan of ₹${baseAmount} has been approved. ₹${netDisbursed} has been credited to your wallet.`,
      type: 'loan',
      link: `/loans/${loan._id}`,
    });
    
  } else if (status === 'rejected' && staff) {
    loan.status = 'rejected';
    loan.rejectedReason = rejectedReason || 'Application rejected';
    loan.rejectedBy = req.user._id;
    loan.rejectedAt = new Date();
    await addTimelineEvent({ loan, user: loan.user, status, description: rejectedReason, performedBy: req.user._id });
    await loan.save();
    
  } else if (status === 'closed' && staff) {
    loan.status = 'closed';
    loan.closedAt = new Date();
    await addTimelineEvent({ loan, user: loan.user, status: 'closed', performedBy: req.user._id });
    await loan.save();
    
  } else if (status === 'cancelled' && staff) {
    loan.status = 'cancelled';
    loan.cancelledAt = new Date();
    loan.cancelledReason = rejectedReason || 'Cancelled';
    await addTimelineEvent({ loan, user: loan.user, status: 'cancelled', performedBy: req.user._id });
    await loan.save();
    
  } else if (interestRate && staff) {
    loan.interestRate = parseFloat(interestRate);
    await loan.save();
  }

  if (remarks) { loan.remarks = remarks; await loan.save(); }

  await createAuditLog({
    user: req.user._id,
    action: `Loan updated: ${loan.loanId} - ${status || 'details'}`,
    entity: 'loan',
    entityId: loan._id,
    details: req.body,
    ipAddress: req.ip,
  });

  const updated = await Loan.findById(loan._id).populate('user', 'name email walletBalance');
  sendResponse(res, 200, 'Loan updated', updated);
});


// Helper function to update fund for disbursement
const updateFundForDisbursement = async (loan, performedBy, netDisbursed) => {
  let fund = await Fund.findOne();
  if (!fund) {
    fund = await Fund.create({
      companyFund: 0,
      openingBalance: 0,
      availableFund: 0,
      cashInHand: 0,
      bankBalance: 0,
    });
  }

  // Check if enough funds available
  if (fund.availableFund < loan.amount) {
    throw new Error(`Insufficient funds. Available: ₹${fund.availableFund}, Required: ₹${loan.amount}`);
  }

  // Update fund
  fund.availableFund = Math.max(0, fund.availableFund - loan.amount);
  fund.companyFund = Math.max(0, fund.companyFund - loan.amount);
  fund.loanDistributed = (fund.loanDistributed || 0) + loan.amount;
  fund.processingFeeEarned = (fund.processingFeeEarned || 0) + (loan.processingFee || 0) + (loan.gstAmount || 0);
  fund.profit = (fund.profit || 0) + (loan.processingFee || 0);
  fund.lastUpdated = new Date();

  // Add history entries
  fund.history.push({
    type: 'loan_disbursement',
    amount: loan.amount,
    description: `Loan ${loan.loanId} disbursed. Net: ₹${netDisbursed}`,
    performedBy: performedBy,
    date: new Date(),
  });

  fund.history.push({
    type: 'processing_fee',
    amount: (loan.processingFee || 0) + (loan.gstAmount || 0),
    description: `Processing fee for ${loan.loanId}`,
    performedBy: performedBy,
    date: new Date(),
  });

  await fund.save();

  // Create transactions
  // Disbursement transaction
  await Transaction.create({
    transactionId: `TXN-${Date.now()}`,
    user: loan.user,
    loan: loan._id,
    type: 'loan_disbursement',
    amount: netDisbursed,
    description: `Loan disbursement - ${loan.loanId} (Net after fees)`,
    status: 'completed',
    reference: loan.loanId,
    metadata: {
      loanId: loan.loanId,
      loanAmount: loan.amount,
      processingFee: loan.processingFee || 0,
      gstAmount: loan.gstAmount || 0,
      netDisbursed: netDisbursed,
    },
  });

  // Processing fee transaction
  await Transaction.create({
    transactionId: `TXN-${Date.now()}-fee`,
    user: loan.user,
    loan: loan._id,
    type: 'processing_fee',
    amount: (loan.processingFee || 0) + (loan.gstAmount || 0),
    description: `Processing fee - ${loan.loanId}`,
    status: 'completed',
    reference: loan.loanId,
  });

  return fund;
};

// ✅ NEW: Helper function to credit user wallet
const creditUserWallet = async (loan, netDisbursed, performedBy) => {
  const user = await User.findById(loan.user);
  if (!user) {
    throw new Error('User not found');
  }

  const balanceBefore = user.walletBalance || 0;
  user.walletBalance = balanceBefore + netDisbursed;
  await user.save();

  // Create wallet transaction
  await Transaction.create({
    transactionId: `WALLET-${Date.now()}`,
    user: loan.user,
    loan: loan._id,
    type: 'loan_disbursement',
    amount: netDisbursed,
    description: `Loan disbursement credited to wallet - ${loan.loanId}`,
    status: 'completed',
    balanceBefore: balanceBefore,
    balanceAfter: user.walletBalance,
    reference: loan.loanId,
    metadata: {
      loanId: loan.loanId,
      netDisbursed: netDisbursed,
      processingFee: loan.processingFee || 0,
      gstAmount: loan.gstAmount || 0,
    },
  });

  // Create notification for wallet credit
  await createNotification({
    user: loan.user,
    title: 'Wallet Credited',
    message: `₹${netDisbursed} has been credited to your wallet from loan ${loan.loanId}`,
    type: 'wallet',
    link: `/wallet`,
  });

  return user;
};

// Helper function to calculate EMI
const calculateEMI = (principal, annualRate, tenureMonths) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenureMonths;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
};

// Helper function to generate EMIs
const generateEMIs = async (loan) => {
  const emis = [];
  const monthlyRate = loan.interestRate / 12 / 100;
  let remainingBalance = loan.amount;
  
  for (let i = 1; i <= loan.tenure; i++) {
    const interest = remainingBalance * monthlyRate;
    const principal = loan.emiAmount - interest;
    remainingBalance -= principal;
    
    const dueDate = new Date(loan.disbursedAt || loan.approvedAt || new Date());
    dueDate.setMonth(dueDate.getMonth() + i);
    
    emis.push({
      loan: loan._id,
      user: loan.user,
      emiNumber: `${loan.loanId}-EMI-${String(i).padStart(2, '0')}`,
      amount: Math.round(loan.emiAmount * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
      dueDate,
      status: 'pending',
      penalty: 0,
      paidAmount: 0,
      pendingAmount: Math.round(loan.emiAmount * 100) / 100,
    });
  }
  
  if (emis.length > 0) {
    await EMI.insertMany(emis);
  }
};

/**
 * @route   POST /api/loans/:id/select-tenure
 */
export const selectLoanTenure = asyncHandler(async (req, res) => {
  const loan = await Loan.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!loan) return sendError(res, 404, 'Loan not found');

  if (loan.user.toString() !== req.user._id.toString() && !isStaffRole(req.user.role)) {
    return sendError(res, 403, 'Not authorized');
  }
  if (loan.status !== 'approved') {
    return sendError(res, 400, 'Loan must be approved before selecting tenure');
  }

  const { tenure } = req.body;
  try {
    const result = await selectTenure(loan, parseInt(tenure), req.user._id);
    sendResponse(res, 200, 'Tenure selected', result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
});


export const calculateLoanEmi = asyncHandler(async (req, res) => {
  const { amount, tenure, loanType = 'personal' } = req.body;
  const plan = await previewEmiPlan(parseFloat(amount), parseInt(tenure), loanType);
  sendResponse(res, 200, 'EMI calculation', plan);
});

/**
 * @route   DELETE /api/loans/:id
 */
export const deleteLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan) return sendError(res, 404, 'Loan not found');

  if (loan.status !== 'pending' && loan.status !== 'cancelled') {
    return sendError(res, 400, 'Only pending loans can be deleted');
  }

  await loan.softDelete(req.user._id);

  sendResponse(res, 200, 'Loan deleted');
});

/**
 * @route   GET /api/loans/:id/statement
 */
export const downloadLoanStatement = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id).populate('user', 'name email');
  if (!loan) return sendError(res, 404, 'Loan not found');

  const emis = await EMI.find({ loan: loan._id }).sort('emiNumber');
  const buffer = await generateLoanStatement(loan, emis, loan.user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=loan-statement-${loan.loanId}.pdf`);
  res.send(buffer);
});

/**
 * @route   GET /api/loans/export/excel
 */
export const exportLoans = asyncHandler(async (req, res) => {
  if (isStaffRole(req.user.role)) {
    await backfillLoanAdminIds(Loan);
  }

  const scopeFilter = await getLoanScopeFilter(req.user);
  const query = Object.keys(scopeFilter).length
    ? { $and: [{ isDeleted: { $ne: true } }, scopeFilter] }
    : { isDeleted: { $ne: true } };

  const loans = await Loan.find(query).populate('user', 'name email').sort('-createdAt');
  const buffer = await exportLoansExcel(loans);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=loans.xlsx');
  res.send(buffer);
});
