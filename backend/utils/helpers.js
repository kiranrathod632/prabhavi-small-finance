import crypto from 'crypto';

/**
 * Generate random token for password reset
 */
export const generateToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

/**
 * Hash a token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Calculate EMI amount using reducing balance method
 */
export const calculateEMI = (principal, annualRate, tenureMonths) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
};

/**
 * Calculate EMI using flat interest method
 */
export const calculateFlatEMI = (principal, annualRate, tenureMonths) => {
  const totalInterest = (principal * annualRate * tenureMonths) / (12 * 100);
  const totalPayable = principal + totalInterest;
  const emi = totalPayable / tenureMonths;
  return {
    emi: Math.round(emi * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
};

/**
 * Get annual rate from settings (handles monthly vs yearly period)
 */
export const normalizeAnnualRate = (rate, period = 'yearly') => {
  if (period === 'monthly') return rate * 12;
  return rate;
};

/**
 * Calculate processing fee breakup
 */
export const calculateProcessingFee = (loanAmount, settings) => {
  let processingFee = 0;
  if (settings.processingFeeType === 'percentage') {
    processingFee = Math.round((loanAmount * (settings.processingFeePercent || 0)) / 100 * 100) / 100;
  } else {
    processingFee = settings.processingFeeValue || 0;
  }

  let gstAmount = 0;
  if (settings.gstEnabled) {
    gstAmount = Math.round((processingFee * (settings.gstPercent || 18)) / 100 * 100) / 100;
  }

  const netDisbursed = Math.round((loanAmount - processingFee - gstAmount) * 100) / 100;

  return { processingFee, gstAmount, netDisbursed };
};

/**
 * Calculate full loan EMI plan with amortization
 */
export const calculateLoanPlan = ({
  principal,
  annualRate,
  tenureMonths,
  interestType = 'reducing_balance',
  startDate = new Date(),
}) => {
  const schedule = [];
  let emiAmount = 0;
  let totalInterest = 0;
  let totalPayable = 0;

  if (interestType === 'flat') {
    const flat = calculateFlatEMI(principal, annualRate, tenureMonths);
    emiAmount = flat.emi;
    totalInterest = flat.totalInterest;
    totalPayable = flat.totalPayable;
    let balance = principal;
    const monthlyPrincipal = principal / tenureMonths;
    const monthlyInterest = totalInterest / tenureMonths;

    for (let i = 1; i <= tenureMonths; i++) {
      balance = Math.max(0, balance - monthlyPrincipal);
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        emiNumber: i,
        amount: emiAmount,
        principal: Math.round(monthlyPrincipal * 100) / 100,
        interest: Math.round(monthlyInterest * 100) / 100,
        dueDate,
        remainingBalance: Math.round(balance * 100) / 100,
        pendingAmount: emiAmount,
      });
    }
  } else {
    emiAmount = calculateEMI(principal, annualRate, tenureMonths);
    totalPayable = calculateTotalPayable(emiAmount, tenureMonths);
    totalInterest = Math.round((totalPayable - principal) * 100) / 100;
    const monthlyRate = annualRate / 12 / 100;
    let balance = principal;

    for (let i = 1; i <= tenureMonths; i++) {
      const interest = Math.round(balance * monthlyRate * 100) / 100;
      const principalPart = Math.round((emiAmount - interest) * 100) / 100;
      balance = Math.round((balance - principalPart) * 100) / 100;
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        emiNumber: i,
        amount: emiAmount,
        principal: principalPart,
        interest,
        dueDate,
        remainingBalance: Math.max(0, balance),
        pendingAmount: emiAmount,
      });
    }
  }

  return {
    emiAmount,
    totalInterest,
    totalPayable,
    totalOutstanding: totalPayable,
    schedule,
  };
};

/**
 * Generate EMI schedule (backward compatible wrapper)
 */
export const generateEMISchedule = (principal, annualRate, tenureMonths, startDate, interestType = 'reducing_balance') => {
  return calculateLoanPlan({ principal, annualRate, tenureMonths, interestType, startDate }).schedule;
};

/**
 * Calculate penalty for overdue EMI
 */
export const calculatePenalty = (emi, settings, daysOverdue = 0) => {
  if (!settings?.penaltyEnabled || daysOverdue <= 0) {
    return { lateFee: 0, dailyPenalty: 0, totalPenalty: 0 };
  }
  const lateFee = settings.latePaymentPenalty || 0;
  const dailyPenalty = settings.dailyPenaltyRate
    ? Math.round(settings.dailyPenaltyRate * daysOverdue * 100) / 100
    : 0;
  return {
    lateFee,
    dailyPenalty,
    totalPenalty: Math.round((lateFee + dailyPenalty) * 100) / 100,
  };
};

/**
 * Check if user has staff role
 */
export const isStaffRole = (role) => {
  return ['super_admin', 'admin', 'recovery_agent'].includes(role);
};

/**
 * Calculate total payable amount
 */
export const calculateTotalPayable = (emi, tenure) => {
  return Math.round(emi * tenure * 100) / 100;
};

/**
 * Build date range filter for reports
 */
export const buildDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let from, to;

  switch (period) {
    case 'today':
      from = new Date(now.setHours(0, 0, 0, 0));
      to = new Date();
      break;
    case 'week': {
      from = new Date();
      from.setDate(from.getDate() - 7);
      to = new Date();
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
      break;
    }
    case 'year': {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date();
      break;
    }
    case 'custom':
      from = startDate ? new Date(startDate) : new Date(0);
      to = endDate ? new Date(endDate) : new Date();
      break;
    default:
      from = new Date(0);
      to = new Date();
  }
  return { from, to };
};

/**
 * Format currency (INR)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Paginate query results
 */
export const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};

/**
 * Build pagination metadata
 */
export const paginationMeta = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
};
