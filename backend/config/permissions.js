/**
 * Role & Permission Configuration
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RECOVERY_AGENT: 'recovery_agent',
  USER: 'user',
};

export const ALL_ROLES = Object.values(ROLES);

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.RECOVERY_AGENT,
];

export const ADMIN_PANEL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const PERMISSIONS = {
  ADMINS_MANAGE: 'admins.manage',
  USERS_MANAGE: 'users.manage',
  USERS_VIEW: 'users.view',
  LOANS_MANAGE: 'loans.manage',
  LOANS_VIEW: 'loans.view',
  LOANS_APPROVE: 'loans.approve',
  EMIS_MANAGE: 'emis.manage',
  EMIS_VIEW: 'emis.view',
  TRANSACTIONS_MANAGE: 'transactions.manage',
  TRANSACTIONS_VIEW: 'transactions.view',
  FUNDS_MANAGE: 'funds.manage',
  FUNDS_VIEW: 'funds.view',
  REPORTS_VIEW: 'reports.view',
  SETTINGS_MANAGE: 'settings.manage',
  RECOVERY_MANAGE: 'recovery.manage',
  RECOVERY_VIEW: 'recovery.view',
  KYC_MANAGE: 'kyc.manage',
  AUDIT_VIEW: 'audit.view',
  DASHBOARD_ADMIN: 'dashboard.admin',
  DASHBOARD_RECOVERY: 'dashboard.recovery',
  NOTIFICATIONS_SEND: 'notifications.send',
  COMMISSION_VIEW: 'commission.view',
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'],
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.LOANS_MANAGE,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_APPROVE,
    PERMISSIONS.EMIS_MANAGE,
    PERMISSIONS.EMIS_VIEW,
    PERMISSIONS.TRANSACTIONS_MANAGE,
    PERMISSIONS.TRANSACTIONS_VIEW,
    PERMISSIONS.FUNDS_MANAGE,
    PERMISSIONS.FUNDS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.RECOVERY_MANAGE,
    PERMISSIONS.RECOVERY_VIEW,
    PERMISSIONS.KYC_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.COMMISSION_VIEW,
  ],
  [ROLES.RECOVERY_AGENT]: [
    PERMISSIONS.RECOVERY_MANAGE,
    PERMISSIONS.RECOVERY_VIEW,
    PERMISSIONS.EMIS_VIEW,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.DASHBOARD_RECOVERY,
  ],
  [ROLES.USER]: [],
};

export const LOGIN_PORTALS = {
  user: [ROLES.USER],
  admin: [ROLES.ADMIN],
  super_admin: [ROLES.SUPER_ADMIN],
};

export const hasPermission = (role, permission) => {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
};

export const isStaff = (role) => STAFF_ROLES.includes(role);

export const isAdminPanelRole = (role) => ADMIN_PANEL_ROLES.includes(role);

export const getDashboardPath = (role) => {
  const paths = {
    [ROLES.SUPER_ADMIN]: '/super-admin/dashboard',
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.RECOVERY_AGENT]: '/recovery/dashboard',
    [ROLES.USER]: '/dashboard',
  };
  return paths[role] || '/dashboard';
};

export const getLoginPath = (role) => {
  const paths = {
    [ROLES.SUPER_ADMIN]: '/admin/login',
    [ROLES.ADMIN]: '/admin/login',
    [ROLES.USER]: '/login',
  };
  return paths[role] || '/login';
};
