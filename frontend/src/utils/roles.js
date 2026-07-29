/**
 * Frontend role & permission utilities (mirrors backend)
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RECOVERY_AGENT: 'recovery_agent',
  USER: 'user',
};

export const STAFF_ROLES = ['super_admin', 'admin', 'recovery_agent'];
export const ADMIN_PANEL_ROLES = ['super_admin', 'admin'];

export const isStaff = (role) => STAFF_ROLES.includes(role);
export const isAdminPanelRole = (role) => ADMIN_PANEL_ROLES.includes(role);

export const getDashboardPath = (role) => {
  const paths = {
    super_admin: '/super-admin/dashboard',
    admin: '/admin/dashboard',
    recovery_agent: '/recovery/dashboard',
    user: '/dashboard',
  };
  return paths[role] || '/dashboard';
};

export const getLoginPath = (role) => {
  if (role === 'user') return '/user/login';
  if (['super_admin', 'admin'].includes(role)) return '/admin/login';
  return '/user/login';
};

export const LOAN_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'under_review', label: 'Under Review', color: 'blue' },
  { value: 'approved', label: 'Approved', color: 'indigo' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'disbursed', label: 'Disbursed', color: 'purple' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'closed', label: 'Closed', color: 'gray' },
  { value: 'defaulted', label: 'Defaulted', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
];

export const TENURE_OPTIONS = [6, 9, 12, 18, 24, 36, 48, 60];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online Payment' },
  { value: 'wallet', label: 'Wallet' },
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
];

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.role === ROLES.ADMIN;
};
