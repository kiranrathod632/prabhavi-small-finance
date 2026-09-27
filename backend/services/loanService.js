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
 * Build / repair EMI rows from current loan plan.
 * Flat interest always uses monthly rate (2.5% → EMI ₹2710 for ₹25k/12m).
 * Replaces pending-only schedules when amounts were calculated with old yearly-flat bug.
 */
export const ensureLoanEmis = async (loan) => {
  if (!loan?.tenure || !loan?.interestRate || !loan?.amount) return null;

  const interestType = loan.interestType || 'reducing_balance';
  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate: loan.interestRate,
    tenureMonths: loan.tenure,
    interestType,
    ratePeriod: interestType === 'flat' ? 'monthly' : (loan.interestRatePeriod || 'yearly'),
    netDisbursed: loan.netDisbursedAmount ?? loan.amount,
    startDate: loan.disbursedAt || loan.approvedAt || loan.startDate || new Date(),
  });

  const existing = await EMI.find({ loan: loan._id, isDeleted: { $ne: true } });
  const anyPaid = existing.some(
    (e) => e.status === 'paid' || e.status === 'partially_paid' || e.status === 'pending_collection' || (e.paidAmount || 0) > 0
  );
  const amountsMatch =
    existing.length === plan.schedule.length &&
    existing.every((e) => Math.abs((e.amount || 0) - plan.emiAmount) < 0.01);

  // Sync loan totals (fixes loans approved before monthly-flat fix)
  const loanNeedsSync =
    Math.abs((loan.emiAmount || 0) - plan.emiAmount) > 0.01 ||
    Math.abs((loan.totalPayable || 0) - plan.totalPayable) > 0.01 ||
    Math.abs((loan.totalInterest || 0) - plan.totalInterest) > 0.01;

  if (loanNeedsSync && !anyPaid) {
    loan.emiAmount = plan.emiAmount;
    loan.totalPayable = plan.totalPayable;
    loan.totalInterest = plan.totalInterest;
    loan.totalEmis = loan.tenure;
    loan.remainingBalance = Math.max(0, plan.totalPayable - (loan.paidAmount || 0));
    loan.totalOutstanding = loan.remainingBalance;
    if (interestType === 'flat') loan.interestRatePeriod = 'monthly';
    await loan.save();
  }

  if (existing.length > 0 && amountsMatch) return plan;
  if (existing.length > 0 && anyPaid) return plan;

  if (existing.length > 0) {
    await EMI.deleteMany({ loan: loan._id });
  }

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

  return plan;
};

/**
 * User selects tenure after loan approval
 */
export const selectTenure = async (loan, tenure, userId) => {
  const settings = await getSettings();

  if (!settings.allowedTenures.includes(tenure) && !settings.customTenureAllowed) {
    throw new Error('Selected tenure is not allowed');
  }

  const interestType = loan.interestType || settings.interestType;
  const annualRate = loan.interestRate || settings.defaultInterestRate;

  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate,
    tenureMonths: tenure,
    interestType,
    ratePeriod: interestType === 'flat'
      ? 'monthly'
      : (loan.interestRatePeriod || settings.interestRatePeriod || 'yearly'),
    netDisbursed: interestType === 'flat'
      ? (loan.netDisbursedAmount ?? loan.amount)
      : null,
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

  // Generate EMI schedule (flat uses monthly rate; reducing respects ratePeriod)
  const plan = calculateLoanPlan({
    principal: loan.amount,
    annualRate: loan.interestRate,
    tenureMonths: loan.tenure,
    interestType: loan.interestType || settings.interestType,
    ratePeriod: (loan.interestType || settings.interestType) === 'flat'
      ? 'monthly'
      : (loan.interestRatePeriod || settings.interestRatePeriod || 'yearly'),
    netDisbursed: (loan.interestType || settings.interestType) === 'flat'
      ? netDisbursed
      : null,
    startDate: loan.startDate,
  });

  // Delete any existing EMIs before inserting fresh schedule
  await EMI.deleteMany({ loan: loan._id });

  const emiDocs = plan.schedule.map((s) => ({
    loan: loan._id,
    user: loan.user,
    ...s,
    pendingAmount: s.amount,
    status: 'pending',
  }));
  await EMI.insertMany(emiDocs);

  loan.emiAmount = plan.emiAmount;
  loan.totalPayable = plan.totalPayable;
  loan.totalInterest = plan.totalInterest;
  loan.remainingBalance = plan.totalPayable;
  loan.totalOutstanding = plan.totalPayable;
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
  const interestType = settings.interestType || 'reducing_balance';
  const plan = calculateLoanPlan({
    principal: amount,
    annualRate,
    tenureMonths: tenure,
    interestType,
    ratePeriod: interestType === 'flat'
      ? 'monthly'
      : (settings.interestRatePeriod || 'yearly'),
  });
  const fees = calculateProcessingFee(amount, settings);
  return { ...plan, interestRate: annualRate, ...fees, settings: { allowedTenures: settings.allowedTenures } };
};