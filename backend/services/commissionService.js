import Commission from '../models/Commission.js';
import User from '../models/User.js';
import { ROLES } from '../config/permissions.js';

/**
 * Create commission record when a loan is approved.
 */
export const createCommissionForLoan = async (loan) => {
  if (!loan?.adminId) return null;

  const admin = await User.findById(loan.adminId);
  if (!admin || admin.role !== ROLES.ADMIN) return null;

  const loanAmount = loan.approvedAmount || loan.amount;
  const commissionPercentage = admin.commissionRate ?? 2;
  const commissionAmount = Math.round((loanAmount * commissionPercentage / 100) * 100) / 100;

  const existing = await Commission.findOne({ loan: loan._id, isDeleted: { $ne: true } });
  if (existing) return existing;

  return Commission.create({
    admin: admin._id,
    loan: loan._id,
    user: loan.user,
    loanAmount,
    commissionPercentage,
    commissionAmount,
    status: 'pending',
  });
};

export const getCommissionReport = async (filter = {}) => {
  return Commission.find({ ...filter, isDeleted: { $ne: true } })
    .populate('admin', 'name email')
    .populate('loan', 'loanId amount status')
    .populate('user', 'name email mobile')
    .sort('-createdAt');
};
