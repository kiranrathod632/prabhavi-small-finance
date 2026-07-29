import Loan from '../models/Loan.js';
import EMI from '../models/EMI.js';
import User from '../models/User.js';
import Fund from '../models/Fund.js';
import Transaction from '../models/Transaction.js';
import { calculateLoanPlan, calculateProcessingFee } from '../utils/helpers.js';
import { getSettings } from './settingsService.js';
import { addTimelineEvent } from './timelineService.js';
import { createNotification } from './notificationService.js';
import { sendLoanStatusEmail } from './emailService.js';
import { sendLoanStatusSms } from './smsService.js';

/**
 * User selects tenure after loan approval
 */
export const selectTenure = async (loan, tenure, userId) => {
  const settings = await getSettings();

  if (!settings.allowedTenures.includes(tenure) && !settings.customTenureAllowed) {
    throw new Error('Selected tenure is not allowed');
  }

  const annualRate = loan.interestRate || settings.defaultInterestRate;
  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate,
    tenureMonths: tenure,
    interestType: loan.interestType || settings.interestType,
  });

  loan.selectedTenure = tenure;
  loan.tenure = tenure;
  loan.tenureSelectedAt = new Date();
  loan.emiAmount = plan.emiAmount;
  loan.totalPayable = plan.totalPayable;
  loan.totalInterest = plan.totalInterest;
  loan.remainingBalance = plan.totalPayable;
  loan.totalOutstanding = plan.totalPayable;
  loan.totalEmis = tenure;
  loan.amortizationSchedule = plan.schedule;
  await loan.save();

  await addTimelineEvent({
    loan,
    user: loan.user,
    status: 'approved',
    title: 'Tenure Selected',
    description: `Customer selected ${tenure} months tenure. EMI: ₹${plan.emiAmount}`,
    performedBy: userId,
    metadata: { tenure, emiAmount: plan.emiAmount, totalPayable: plan.totalPayable },
  });

  return { loan, plan };
};

/**
 * Disburse approved loan with processing fee deduction
 */
export const disburseLoan = async (loan, performedBy) => {
  const settings = await getSettings();
  const fund = await Fund.findOne();

  if (!fund || fund.availableFund < loan.amount) {
    throw new Error('Insufficient funds for disbursement');
  }

  if (!loan.tenure || !loan.selectedTenure) {
    throw new Error('Customer must select tenure before disbursement');
  }

  const calculated = calculateProcessingFee(loan.amount, settings);
  const processingFee = loan.processingFee > 0 ? loan.processingFee : calculated.processingFee;
  const gstAmount = loan.gstAmount > 0 ? loan.gstAmount : calculated.gstAmount;
  const netDisbursed = Math.round((loan.amount - processingFee - gstAmount) * 100) / 100;

  loan.processingFee = processingFee;
  loan.gstAmount = gstAmount;
  loan.netDisbursedAmount = netDisbursed;
  loan.processingFeeDeductedAt = new Date();
  loan.status = 'disbursed';
  loan.disbursedAt = new Date();
  loan.disbursedBy = performedBy;
  loan.disbursedAmount = netDisbursed;
  loan.startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + loan.tenure);
  loan.endDate = endDate;

  // Update fund
  fund.availableFund -= loan.amount;
  fund.loanDistributed += loan.amount;
  fund.processingFeeEarned += processingFee + gstAmount;
  fund.profit += processingFee;
  fund.history.push({
    type: 'loan_disbursement',
    amount: loan.amount,
    description: `Loan ${loan.loanId} disbursed. Net: ₹${netDisbursed}`,
    performedBy,
  });
  fund.history.push({
    type: 'processing_fee',
    amount: processingFee + gstAmount,
    description: `Processing fee for ${loan.loanId}`,
    performedBy,
  });
  await fund.save();

  // Credit user wallet with net amount
  const user = await User.findById(loan.user);
  const balanceBefore = user.walletBalance;
  user.walletBalance += netDisbursed;
  await user.save();

  // Processing fee transaction
  await Transaction.create({
    user: loan.user,
    type: 'processing_fee',
    amount: processingFee + gstAmount,
    description: `Processing fee - ${loan.loanId}`,
    loan: loan._id,
    createdBy: performedBy,
    status: 'completed',
  });

  // Disbursement transaction
  await Transaction.create({
    user: loan.user,
    type: 'loan_disbursement',
    amount: netDisbursed,
    description: `Loan disbursement - ${loan.loanId} (Net after fees)`,
    loan: loan._id,
    balanceBefore,
    balanceAfter: user.walletBalance,
    createdBy: performedBy,
    metadata: { loanAmount: loan.amount, processingFee, gstAmount, netDisbursed },
  });

  // Generate EMI schedule
  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate: loan.interestRate,
    tenureMonths: loan.tenure,
    interestType: loan.interestType,
    startDate: loan.startDate,
  });

  const emiDocs = plan.schedule.map((s) => ({
    loan: loan._id,
    user: loan.user,
    ...s,
    pendingAmount: s.amount,
    status: 'pending',
  }));
  await EMI.insertMany(emiDocs);

  loan.status = 'active';
  await loan.save();

  await addTimelineEvent({
    loan,
    user: loan.user,
    status: 'disbursed',
    title: 'Loan Disbursed',
    description: `₹${netDisbursed} credited after processing fee of ₹${processingFee + gstAmount}`,
    performedBy,
    metadata: { processingFee, gstAmount, netDisbursed },
  });

  await createNotification({
    user: loan.user,
    title: 'Loan Disbursed',
    message: `₹${netDisbursed} has been credited to your wallet for loan ${loan.loanId}`,
    type: 'loan',
    link: `/loans/${loan._id}`,
  });

  if (user.email) await sendLoanStatusEmail(user, loan, 'disbursed');
  if (user.mobile) await sendLoanStatusSms(user.mobile, loan.loanId, 'disbursed');

  return loan;
};

/**
 * Preview EMI calculation without saving
 */
export const previewEmiPlan = async (amount, tenure, loanType) => {
  const settings = await getSettings();
  const annualRate = settings.loanTypeRates?.[loanType] || settings.defaultInterestRate;
  const plan = calculateLoanPlan({
    principal: amount,
    annualRate,
    tenureMonths: tenure,
    interestType: settings.interestType,
  });
  const fees = calculateProcessingFee(amount, settings);
  return { ...plan, interestRate: annualRate, ...fees, settings: { allowedTenures: settings.allowedTenures } };
};
