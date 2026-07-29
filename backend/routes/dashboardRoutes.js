import { Router } from 'express';
import { getAdminDashboard, getUserDashboard, getReport } from '../controllers/dashboardController.js';
import { getRecoveryDashboard } from '../controllers/recoveryController.js';
import { protect, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = Router();

router.use(protect);

router.get('/admin', requirePermission(PERMISSIONS.DASHBOARD_ADMIN), getAdminDashboard);
router.get('/recovery', requirePermission(PERMISSIONS.DASHBOARD_RECOVERY), getRecoveryDashboard);
router.get('/user', getUserDashboard);
router.get('/reports/:type', requirePermission(PERMISSIONS.REPORTS_VIEW), getReport);

export default router;
