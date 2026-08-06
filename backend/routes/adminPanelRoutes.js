import { Router } from 'express';
import { protect, authorize, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ADMIN_PANEL_ROLES, PERMISSIONS, ROLES } from '../config/permissions.js';
import {
  adminPanelLogin, adminPanelRegister, adminPanelMe, adminPanelLogout,
} from '../controllers/adminPanelAuthController.js';
import {
  getUsers, getUser, createUser, updateUser, deleteUser, exportUsers,
} from '../controllers/userController.js';
import {
  getLoans, getLoan, updateLoan, exportLoans,
} from '../controllers/loanController.js';
import {
  getEMIs, getEMI, updateEMI, downloadReceipt,
  adminCollectEMI, adminPartialPayEMI, adminAddPenalty,
} from '../controllers/emiController.js';
import { getAdminDashboard } from '../controllers/dashboardController.js';
import {
  
  getAdmins, createAdmin, updateAdmin, deleteAdmin,
  activateAdmin, deactivateAdmin, resetAdminPassword, assignUserToAdmin,
  sendAdminInviteOtp, verifyAdminInviteOtp,
} from '../controllers/adminController.js';
import { updateFund, getFunds } from '../controllers/fundController.js';
import {
  getPurchases, createPurchase, approvePurchase, rejectPurchase, getPurchaseSummary,
} from '../controllers/purchaseController.js';
import { uploadSingle } from '../middlewares/upload.js';
import {
  getNotifications, markAsRead, markAllAsRead,
} from '../controllers/notificationController.js';
import {
  listCommissions, updateCommissionRate,
} from '../controllers/commissionController.js';
import {
  createUserValidator, updateUserValidator, mongoIdValidator, paginationValidator,
  loginValidator, adminRegisterValidator, updateLoanValidator, payEMIValidator,
} from '../validators/index.js';

const router = Router();

// ─── Admin Auth (public) ───
router.post('/auth/login', loginValidator, validate, adminPanelLogin);
router.post('/auth/register', adminRegisterValidator, validate, adminPanelRegister);

// ─── Protected admin panel routes ───
router.use(protect, authorize(...ADMIN_PANEL_ROLES));

router.get('/auth/me', adminPanelMe);
router.post('/auth/logout', adminPanelLogout);

router.get('/dashboard', requirePermission(PERMISSIONS.DASHBOARD_ADMIN), getAdminDashboard);

// Users — admin creates & manages users under them
router.get('/users/export/excel', requirePermission(PERMISSIONS.USERS_VIEW), exportUsers);
router.get('/users', paginationValidator, validate, requirePermission(PERMISSIONS.USERS_VIEW), getUsers);
router.get('/users/:id', mongoIdValidator, validate, requirePermission(PERMISSIONS.USERS_VIEW), getUser);
router.post('/users', createUserValidator, validate, requirePermission(PERMISSIONS.USERS_MANAGE), createUser);
router.put('/users/:id', mongoIdValidator, updateUserValidator, validate, requirePermission(PERMISSIONS.USERS_MANAGE), updateUser);
router.delete('/users/:id', mongoIdValidator, validate, requirePermission(PERMISSIONS.USERS_MANAGE), deleteUser);

// Loans
router.get('/loans/export/excel', requirePermission(PERMISSIONS.LOANS_VIEW), exportLoans);
router.get('/loans', paginationValidator, validate, requirePermission(PERMISSIONS.LOANS_VIEW), getLoans);
router.get('/loans/:id', mongoIdValidator, validate, requirePermission(PERMISSIONS.LOANS_VIEW), getLoan);
router.put('/loans/:id', mongoIdValidator, updateLoanValidator, validate, requirePermission(PERMISSIONS.LOANS_APPROVE), updateLoan);

// EMIs — collect, partial pay, penalty
router.get('/emis', paginationValidator, validate, requirePermission(PERMISSIONS.EMIS_VIEW), getEMIs);
router.get('/emis/:id', mongoIdValidator, validate, requirePermission(PERMISSIONS.EMIS_VIEW), getEMI);
router.get('/emis/:id/receipt', mongoIdValidator, validate, downloadReceipt);
router.put('/emis/:id', mongoIdValidator, requirePermission(PERMISSIONS.EMIS_MANAGE), updateEMI);
router.post('/emis/:id/collect', mongoIdValidator, validate, requirePermission(PERMISSIONS.EMIS_MANAGE), adminCollectEMI);
router.post('/emis/:id/partial-pay', mongoIdValidator, validate, requirePermission(PERMISSIONS.EMIS_MANAGE), adminPartialPayEMI);
router.put('/emis/:id/penalty', mongoIdValidator, requirePermission(PERMISSIONS.EMIS_MANAGE), adminAddPenalty);

// Commission — Super Admin sets %; Admins earn on approved loans under them
router.get('/commissions', requirePermission(PERMISSIONS.COMMISSION_VIEW), listCommissions);
router.put('/commission-rate', authorize(ROLES.SUPER_ADMIN), updateCommissionRate);

// Super Admin only — manage admins
router.get('/manage/admins', authorize(ROLES.SUPER_ADMIN), getAdmins);
router.post('/manage/admins/send-otp', authorize(ROLES.SUPER_ADMIN), sendAdminInviteOtp);
router.post('/manage/admins/verify-otp', authorize(ROLES.SUPER_ADMIN), verifyAdminInviteOtp);
router.post('/manage/admins', authorize(ROLES.SUPER_ADMIN), createAdmin);
router.put('/manage/admins/:id', mongoIdValidator, authorize(ROLES.SUPER_ADMIN), updateAdmin);
router.delete('/manage/admins/:id', mongoIdValidator, authorize(ROLES.SUPER_ADMIN), deleteAdmin);
router.put('/manage/admins/:id/activate', mongoIdValidator, authorize(ROLES.SUPER_ADMIN), activateAdmin);
router.put('/manage/admins/:id/deactivate', mongoIdValidator, authorize(ROLES.SUPER_ADMIN), deactivateAdmin);
router.put('/manage/admins/:id/reset-password', mongoIdValidator, authorize(ROLES.SUPER_ADMIN), resetAdminPassword);
router.put('/manage/users/:userId/assign', authorize(ROLES.SUPER_ADMIN), assignUserToAdmin);

// Funds
router.get('/funds', requirePermission(PERMISSIONS.FUNDS_VIEW), getFunds);
router.post('/funds', requirePermission(PERMISSIONS.FUNDS_MANAGE), updateFund);

// Purchases / expenses — Admin requests; Super Admin approves then fund deducts
router.get('/purchases/summary', requirePermission(PERMISSIONS.FUNDS_VIEW), getPurchaseSummary);
router.get('/purchases', paginationValidator, validate, requirePermission(PERMISSIONS.FUNDS_VIEW), getPurchases);
router.post(
  '/purchases',
  requirePermission(PERMISSIONS.FUNDS_MANAGE),
  uploadSingle('billPhoto'),
  createPurchase
);
router.put(
  '/purchases/:id/approve',
  mongoIdValidator,
  validate,
  authorize(ROLES.SUPER_ADMIN),
  approvePurchase
);
router.put(
  '/purchases/:id/reject',
  mongoIdValidator,
  validate,
  authorize(ROLES.SUPER_ADMIN),
  rejectPurchase
);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', mongoIdValidator, markAsRead);
router.put('/notifications/read-all', markAllAsRead);

export default router;
