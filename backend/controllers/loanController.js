import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import User from '../models/User.js';
import Fund from '../models/Fund.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta, isStaffRole, calculateLoanPlan } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';
import { notifyLoanUpdate } from '../services/notificationService.js';
import { sendLoanStatusEmail } from '../services/emailService.js';
import { generateLoanStatement } from '../utils/pdfGenerator.js';
import { exportLoansExcel } from '../utils/excelExport.js';
import { getInterestRateForLoanType, getSettings } from '../services/settingsService.js';
import { addTimelineEvent, getLoanTimeline } from '../services/timelineService.js';
import { selectTenure, disburseLoan, previewEmiPlan } from '../services/loanService.js';
import { sendLoanStatusSms, sendLoanApplicationAdminSms } from '../services/smsService.js';
import {
  getLoanScopeFilter,
  canAccessAdminScope,
  backfillLoanAdminIds,
  resolveAdminId,
} from '../middlewares/scope.js';
import { createCommissionForLoan } from '../services/commissionService.js';
import { ROLES } from '../config/permissions.js';
import { createNotification } from '../services/notificationService.js';
import Profile from '../models/Profile.js';
import { hasRequiredKycDocuments } from '../utils/kycHelpers.js';

/**
 * @route   POST /api/loans
 */
// controllers/loanController.js
// export const createLoan = asyncHandler(async (req, res) => {
//   const { loanType, amount, purpose, status: reqStatus } = req.body;
//   const userId = isStaffRole(req.user.role) && req.body.userId ? req.body.userId : req.user._id;

//   const loanUser = await User.findById(userId);
//   if (!loanUser) return sendError(res, 404, 'User not found');

//   // End-users must finish profile setup + KYC docs before applying
//   if (loanUser.role === ROLES.USER || loanUser.role === 'user') {
//     if (loanUser.profileSetupComplete === false) {
//       return sendError(res, 400, 'Please complete your profile before applying for a loan');
//     }

//     const profile = await Profile.findOne({ user: userId });
//     const kycOk = loanUser.kycCompleted === true || hasRequiredKycDocuments(profile);
//     if (!kycOk) {
//       return sendError(
//         res,
//         400,
//         'Please complete KYC by uploading Aadhaar card, PAN card, and bank photo before applying for a loan'
//       );
//     }

//     // Keep User flag in sync if docs exist but flag was stale
//     if (!loanUser.kycCompleted && kycOk) {
//       loanUser.kycCompleted = true;
//       await loanUser.save();
//     }
//   }

//   const settings = await getSettings();
//   if (amount < settings.minLoanAmount || amount > settings.maxLoanAmount) {
//     return sendError(res, 400, `Loan amount must be between ₹${settings.minLoanAmount} and ₹${settings.maxLoanAmount}`);
//   }

//   const interestRate = req.body.interestRate || await getInterestRateForLoanType(loanType);
//   const initialStatus = reqStatus === 'draft' ? 'draft' : 'pending';

//   // ✅ Define adminId
//   const adminId = loanUser.adminId || null;

//   const loan = await Loan.create({
//     user: userId,
//     adminId: adminId,
//     loanType,
//     amount,
//     interestRate,
//     interestType: settings.interestType,
//     interestRatePeriod: settings.interestRatePeriod,
//     // purpose,
//     status: initialStatus,
//   });

//   if (initialStatus === 'pending') {
//     await addTimelineEvent({
//       loan, 
//       user: userId, 
//       status: 'pending',
//       title: 'Application Submitted',
//       description: `Loan application for ₹${amount} submitted`,
//       performedBy: req.user._id,
//     });

//     await notifyLoanUpdate(userId, loan, 'pending');
//     const applicantMobile = loanUser.mobile_number || loanUser.mobile;
//     if (applicantMobile) {
//       await sendLoanStatusSms(applicantMobile, loan.loanId, 'pending');
//     }

//     // Notify assigned admin (SMS + in-app + push) with account details
//     const recipientIds = new Set();
//     if (loanUser.adminId) recipientIds.add(loanUser.adminId.toString());

//     // Also keep super admins informed (existing coverage)
//     const superAdmins = await User.find({
//       role: ROLES.SUPER_ADMIN,
//       isActive: true,
//       isDeleted: { $ne: true },
//     }).select('_id');
//     superAdmins.forEach((sa) => recipientIds.add(sa._id.toString()));

//     if (recipientIds.size) {
//       const staffRecipients = await User.find({
//         _id: { $in: [...recipientIds] },
//         isActive: true,
//         isDeleted: { $ne: true },
//       }).select('_id mobile_number mobile role');

//       const accountLabel = loanUser.mobile_number || loanUser.mobile || loanUser.email || 'N/A';
//       for (const staff of staffRecipients) {
//         await createNotification({
//           user: staff._id,
//           title: 'New Loan Application',
//           message: `${loanUser.name} (Account: ${accountLabel}) applied for a loan of ₹${amount}. Loan ID: ${loan.loanId}.`,
//           type: 'info',
//           link: staff.role === ROLES.SUPER_ADMIN
//             ? `/super-admin/loans`
//             : `/admin/loans`,
//           metadata: {
//             loanId: loan.loanId,
//             userId: loanUser._id.toString(),
//             amount: String(amount),
//           },
//         });

//         const adminMobile = staff.mobile_number || staff.mobile;
//         if (adminMobile) {
//           await sendLoanApplicationAdminSms({
//             adminMobile,
//             user: loanUser,
//             loan,
//           });
//         }
//       }
//     }
//   }

//   await createAuditLog({
//     user: req.user._id,
//     action: `Loan application submitted: ${loan.loanId}`,
//     entity: 'loan',
//     entityId: loan._id,
//     ipAddress: req.ip,
//   });

//   sendResponse(res, 201, 'Loan application submitted', loan);
// });

export const createLoan = asyncHandler(async (req, res) => {
  const { loanType, amount, purpose, status: reqStatus } = req.body;
  const userId = isStaffRole(req.user.role) && req.body.userId ? req.body.userId : req.user._id;

  const loanUser = await User.findById(userId);
  if (!loanUser) return sendError(res, 404, 'User not found');

  // ✅ Check if user already has a pending/under_review/approved loan
  const existingPendingLoan = await Loan.findOne({
    user: userId,
    status: { $in: ['pending', 'under_review', 'approved'] },
    isDeleted: { $ne: true }
  });

  if (existingPendingLoan) {
    const lastLoanDate = existingPendingLoan.createdAt;
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate - lastLoanDate) / (1000 * 60 * 60 * 24));
    
    // ✅ Allow if more than 8 days have passed
    if (daysDifference < 8) {
      const remainingDays = 8 - daysDifference;
      return sendResponse(
        res,
        200,
        `You already have a pending loan application. You can apply for a new loan after ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
        {
          loan: existingPendingLoan,
          canApply: false,
          remainingDays: remainingDays,
          nextEligibleDate: new Date(lastLoanDate.getTime() + 8 * 24 * 60 * 60 * 1000)
        }
      );
    }
  }

  // ✅ Check if user has any active loan
  const existingActiveLoan = await Loan.findOne({
    user: userId,
    status: { $in: ['active', 'disbursed'] },
    isDeleted: { $ne: true }
  });

  if (existingActiveLoan) {
    const lastLoanDate = existingActiveLoan.createdAt;
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate - lastLoanDate) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < 8) {
      const remainingDays = 8 - daysDifference;
      return sendResponse(
        res,
        200,
        `You have an active loan. You can apply for a new loan after ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
        {
          loan: existingActiveLoan,
          canApply: false,
          remainingDays: remainingDays,
          nextEligibleDate: new Date(lastLoanDate.getTime() + 8 * 24 * 60 * 60 * 1000)
        }
      );
    }
  }

  // ✅ Check for recently closed loans (within last 8 days)
  const recentlyClosedLoan = await Loan.findOne({
    user: userId,
    status: 'closed',
    isDeleted: { $ne: true },
    closedAt: { 
      $gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    }
  });

  if (recentlyClosedLoan) {
    const closedDate = recentlyClosedLoan.closedAt;
    const currentDate = new Date();
    const daysDifference = Math.floor((currentDate - closedDate) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < 8) {
      const remainingDays = 8 - daysDifference;
      return sendResponse(
        res,
        200,
        `Your last loan was recently closed. You can apply for a new loan after ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
        {
          loan: recentlyClosedLoan,
          canApply: false,
          remainingDays: remainingDays,
          nextEligibleDate: new Date(closedDate.getTime() + 8 * 24 * 60 * 60 * 1000)
        }
      );
    }
  }

  // ✅ Check for duplicate loan application (same amount, same type within last 5 minutes)
  const duplicateLoan = await Loan.findOne({
    user: userId,
    status: { $in: ['pending', 'under_review', 'approved'] },
    amount: amount,
    loanType: loanType,
    isDeleted: { $ne: true },
    createdAt: { 
      $gte: new Date(Date.now() - 5 * 60 * 1000)
    }
  });

  if (duplicateLoan) {
    return sendResponse(
      res, 
      200, 
      'You have already submitted a loan application. Please wait for it to be processed.',
      {
        loan: duplicateLoan,
        canApply: false
      }
    );
  }

  // End-users must finish profile setup + KYC docs before applying
  if (loanUser.role === ROLES.USER || loanUser.role === 'user') {
    if (loanUser.profileSetupComplete === false) {
      return sendError(res, 400, 'Please complete your profile before applying for a loan');
    }

    const profile = await Profile.findOne({ user: userId });
    const kycOk = loanUser.kycCompleted === true || hasRequiredKycDocuments(profile);
    if (!kycOk) {
      return sendError(
        res,
        400,
        'Please complete KYC by uploading Aadhaar card, PAN card, and bank photo before applying for a loan'
      );
    }

    // Keep User flag in sync if docs exist but flag was stale
    if (!loanUser.kycCompleted && kycOk) {
      loanUser.kycCompleted = true;
      await loanUser.save();
    }
  }

  const settings = await getSettings();
  if (amount < settings.minLoanAmount || amount > settings.maxLoanAmount) {
    return sendError(res, 400, `Loan amount must be between ₹${settings.minLoanAmount} and ₹${settings.maxLoanAmount}`);
  }

  const interestRate = req.body.interestRate || await getInterestRateForLoanType(loanType);
  const initialStatus = reqStatus === 'draft' ? 'draft' : 'pending';

  // ✅ Define adminId
  const adminId = loanUser.adminId || null;

  // ✅ Generate unique loanId with retry mechanism
  let loanId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (!isUnique && attempts < maxAttempts) {
    // Get the latest loan to generate next number
    const lastLoan = await Loan.findOne({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .select('loanId');
    
    let nextNumber = 1;
    if (lastLoan && lastLoan.loanId) {
      const match = lastLoan.loanId.match(/LN(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    loanId = `LN${String(nextNumber).padStart(6, '0')}`;
    
    // Check if this loanId already exists
    const existingLoan = await Loan.findOne({ loanId, isDeleted: { $ne: true } });
    if (!existingLoan) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback: use timestamp based unique ID
    loanId = `LN${Date.now().toString().slice(-6)}`;
  }

  const loan = await Loan.create({
    user: userId,
    adminId: adminId,
    loanType,
    amount,
    interestRate,
    interestType: settings.interestType,
    interestRatePeriod: settings.interestRatePeriod,
    // purpose,
    status: initialStatus,
    loanId: loanId, // Explicitly set the generated loanId
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

    // Notify assigned admin (SMS + in-app + push) with account details
    const recipientIds = new Set();
    if (loanUser.adminId) recipientIds.add(loanUser.adminId.toString());

    // Also keep super admins informed (existing coverage)
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

      const accountLabel = loanUser.mobile_number || loanUser.mobile || loanUser.email || 'N/A';
      for (const staff of staffRecipients) {
        await createNotification({
          user: staff._id,
          title: 'New Loan Application',
          message: `${loanUser.name} (Account: ${accountLabel}) applied for a loan of ₹${amount}. Loan ID: ${loan.loanId}.`,
          type: 'info',
          link: staff.role === ROLES.SUPER_ADMIN
            ? `/super-admin/loans`
            : `/admin/loans`,
          metadata: {
            loanId: loan.loanId,
            userId: loanUser._id.toString(),
            amount: String(amount),
          },
        });

        const adminMobile = staff.mobile_number || staff.mobile;
        if (adminMobile) {
          await sendLoanApplicationAdminSms({
            adminMobile,
            user: loanUser,
            loan,
          });
        }
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
    Loan.find(filter).populate('user', 'name firstName middleName lastName email').sort(sort).skip(skip).limit(limit),
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

  const {
    status,
    interestRate,
    interestType,
    interestRatePeriod,
    processingFee,
    gstAmount,
    rejectedReason,
    remarks,
    approvedAmount,
    tenure,
    emiStartDate,
    dueDate,
  } = req.body;
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
    // Idempotent: only pending / under_review loans can be approved once
    if (!['pending', 'under_review'].includes(loan.status)) {
      return sendError(res, 400, 'Loan already approved or cannot be approved in current status');
    }

    // Atomic claim — prevents double-click / parallel approvals
    const claim = await Loan.findOneAndUpdate(
      { _id: loan._id, status: { $in: ['pending', 'under_review'] } },
      {
        $set: {
          status: 'approved',
          approvedBy: req.user._id,
          approvedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!claim) {
      return sendError(res, 400, 'Loan already approved or cannot be approved in current status');
    }

    const freshLoan = claim;

    // 1. Update loan details
    if (interestRate !== undefined && interestRate !== null && interestRate !== '') {
      freshLoan.interestRate = parseFloat(interestRate);
    }
    if (interestType && ['flat', 'reducing_balance'].includes(interestType)) {
      freshLoan.interestType = interestType;
    }
    if (interestRatePeriod && ['monthly', 'yearly'].includes(interestRatePeriod)) {
      freshLoan.interestRatePeriod = interestRatePeriod;
    }
    if (approvedAmount) freshLoan.approvedAmount = Number(approvedAmount);
    if (tenure) freshLoan.tenure = Number(tenure);
    if (emiStartDate) freshLoan.emiStartDate = new Date(emiStartDate);
    if (dueDate) freshLoan.dueDate = new Date(dueDate);
    
    // 2. Processing fee & GST
    if (processingFee !== undefined && processingFee !== null) {
      freshLoan.processingFee = Number(processingFee) || 0;
    }
    if (gstAmount !== undefined && gstAmount !== null) {
      freshLoan.gstAmount = Number(gstAmount) || 0;
    }
    
    // 3. Calculate net disbursed amount
    const baseAmount = freshLoan.approvedAmount || freshLoan.amount;
    const netDisbursed = Math.max(0, baseAmount - (freshLoan.processingFee || 0) - (freshLoan.gstAmount || 0));
    freshLoan.netDisbursedAmount = netDisbursed;
    freshLoan.disbursedAmount = netDisbursed;
    
    // 4. Calculate EMI if tenure is provided (supports flat + reducing)
    // interestRate is treated as annual % — same as previous calculateEMI behavior
    if (freshLoan.tenure && freshLoan.interestRate) {
      const plan = calculateLoanPlan({
        principal: freshLoan.amount,
        annualRate: freshLoan.interestRate,
        tenureMonths: freshLoan.tenure,
        interestType: freshLoan.interestType || 'reducing_balance',
      });
      freshLoan.emiAmount = plan.emiAmount;
      freshLoan.totalPayable = plan.totalPayable;
      freshLoan.totalInterest = plan.totalInterest;
      freshLoan.totalEmis = freshLoan.tenure;
      freshLoan.remainingBalance = plan.totalPayable;
      freshLoan.totalOutstanding = plan.totalPayable;
    }
    
    // 5. Set loan as active/disbursed
    freshLoan.status = 'active';
    freshLoan.disbursedAt = new Date();
    freshLoan.disbursedBy = req.user._id;
    freshLoan.startDate = new Date();
    freshLoan.processingFeeDeductedAt = new Date();
    
    // Set end date
    if (freshLoan.tenure) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + freshLoan.tenure);
      freshLoan.endDate = endDate;
    }
    
    // 6. Save loan first
    await freshLoan.save();
    
    // 7. ✅ UPDATE FUND - Deduct disbursed amount from fund
    try {
      await updateFundForDisbursement(freshLoan, req.user._id, netDisbursed);
    } catch (error) {
      // Revert loan status if fund update fails
      freshLoan.status = 'approved';
      await freshLoan.save();
      return sendError(res, 400, error.message);
    }
    
    // 8. ✅ CREDIT USER WALLET - Add net disbursed amount to user's wallet
    try {
      await creditUserWallet(freshLoan, netDisbursed, req.user._id);
    } catch (error) {
      // Log error but don't fail the whole process
      console.error('Failed to credit wallet:', error);
    }
    
    // 9. Generate EMIs
    if (freshLoan.tenure && freshLoan.emiAmount) {
      await generateEMIs(freshLoan);
    }
    
    // 10. Add timeline events
    await addTimelineEvent({ 
      loan: freshLoan, 
      user: freshLoan.user, 
      status: 'approved', 
      title: 'Loan Approved & Disbursed',
      description: `Loan approved for ₹${baseAmount}. Net disbursed: ₹${netDisbursed} credited to wallet`,
      performedBy: req.user._id 
    });
    
    await addTimelineEvent({ 
      loan: freshLoan, 
      user: freshLoan.user, 
      status: 'active', 
      title: 'Loan Active',
      description: `EMI of ₹${freshLoan.emiAmount || 0} for ${freshLoan.tenure || 0} months`,
      performedBy: req.user._id 
    });
    
    // 11. Create commission
    await createCommissionForLoan(freshLoan);
    
    // 12. Send notifications
    await notifyLoanUpdate(freshLoan.user, freshLoan, 'active');
    const user = await User.findById(freshLoan.user);
    const userMobile = user?.mobile_number || user?.mobile;
    if (user?.email) await sendLoanStatusEmail(user, freshLoan, 'active');
    if (userMobile) await sendLoanStatusSms(userMobile, freshLoan.loanId, 'approved');
    
    await createNotification({
      user: freshLoan.user,
      title: 'Loan Approved & Disbursed',
      message: `Your loan of ₹${baseAmount} has been approved. ₹${netDisbursed} has been credited to your wallet.`,
      type: 'loan',
      link: `/loans/${freshLoan._id}`,
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

  const updated = await Loan.findById(loan._id).populate('user', 'name firstName middleName lastName email walletBalance');
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
  // Idempotent: skip if wallet already credited for this loan
  const existingCredit = await Transaction.findOne({
    loan: loan._id,
    type: 'loan_disbursement',
    reference: loan.loanId,
    status: 'completed',
  });
  if (existingCredit) return null;

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
    type: 'payment',
    link: `/wallet`,
  });

  return user;
};

// Helper function to generate EMIs (flat + reducing_balance)
const generateEMIs = async (loan) => {
  const existing = await EMI.countDocuments({ loan: loan._id, isDeleted: { $ne: true } });
  if (existing > 0) return; // idempotent — do not create duplicate EMI rows

  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate: loan.interestRate,
    tenureMonths: loan.tenure,
    interestType: loan.interestType || 'reducing_balance',
    startDate: loan.disbursedAt || loan.approvedAt || new Date(),
  });

  const emis = plan.schedule.map((row, idx) => ({
    loan: loan._id,
    user: loan.user,
    emiNumber: `${loan.loanId}-EMI-${String(idx + 1).padStart(2, '0')}`,
    amount: Math.round(row.amount * 100) / 100,
    principal: Math.round(row.principal * 100) / 100,
    interest: Math.round(row.interest * 100) / 100,
    remainingBalance: Math.max(0, Math.round(row.remainingBalance * 100) / 100),
    dueDate: row.dueDate,
    status: 'pending',
    penalty: 0,
    paidAmount: 0,
    pendingAmount: Math.round(row.amount * 100) / 100,
  }));
  
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
