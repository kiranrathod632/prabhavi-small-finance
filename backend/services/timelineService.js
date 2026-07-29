import LoanTimeline from '../models/LoanTimeline.js';

const STATUS_LABELS = {
  pending: 'Application Submitted',
  under_review: 'Under Review',
  approved: 'Loan Approved',
  rejected: 'Loan Rejected',
  disbursed: 'Loan Disbursed',
  active: 'Loan Active',
  closed: 'Loan Closed',
  defaulted: 'Loan Defaulted',
  cancelled: 'Loan Cancelled',
};

/**
 * Add timeline event for a loan
 */
export const addTimelineEvent = async ({
  loan, user, status, title, description, performedBy, metadata,
}) => {
  try {
    return await LoanTimeline.create({
      loan: loan._id || loan,
      user: user._id || user,
      status,
      title: title || STATUS_LABELS[status] || status,
      description: description || '',
      performedBy,
      metadata,
    });
  } catch (error) {
    console.error('Timeline error:', error.message);
    return null;
  }
};

/**
 * Get loan timeline
 */
export const getLoanTimeline = async (loanId) => {
  return LoanTimeline.find({ loan: loanId })
    .populate('performedBy', 'name role')
    .sort('createdAt');
};
