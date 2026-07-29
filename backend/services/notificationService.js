import Notification from '../models/Notification.js';

/**
 * Create a notification for a user
 */
export const createNotification = async ({ user, title, message, type = 'info', link, metadata }) => {
  try {
    return await Notification.create({ user, title, message, type, link, metadata });
  } catch (error) {
    console.error('Notification error:', error.message);
    return null;
  }
};

/**
 * Create loan-related notification
 */
export const notifyLoanUpdate = async (userId, loan, status) => {
  const messages = {
    approved: 'Your loan has been approved!',
    rejected: 'Your loan application was rejected.',
    disbursed: 'Loan amount has been disbursed.',
    closed: 'Your loan has been closed.',
    pending: 'Your loan application is under review.',
  };
  return createNotification({
    user: userId,
    title: `Loan ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: messages[status] || `Loan status updated to ${status}`,
    type: 'loan',
    link: `/loans/${loan._id}`,
    metadata: { loanId: loan.loanId },
  });
};

/**
 * Create EMI-related notification
 */
export const notifyEMIUpdate = async (userId, emi, loan, action) => {
  const messages = {
    due: `EMI #${emi.emiNumber} of ₹${emi.amount} is due on ${new Date(emi.dueDate).toLocaleDateString('en-IN')}`,
    paid: `EMI #${emi.emiNumber} payment of ₹${emi.amount} received successfully.`,
    overdue: `EMI #${emi.emiNumber} is overdue. Please pay immediately to avoid penalties.`,
  };
  return createNotification({
    user: userId,
    title: `EMI ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    message: messages[action] || `EMI update: ${action}`,
    type: 'emi',
    link: `/emis`,
    metadata: { emiNumber: emi.emiNumber, loanId: loan.loanId },
  });
};
