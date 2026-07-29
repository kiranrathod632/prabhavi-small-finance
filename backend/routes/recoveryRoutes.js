import { Router } from 'express';
import {
  getRecoveryDashboard, getRecoveryCases, createRecoveryCase, updateRecoveryCase,
  addRecoveryNote, getRecoveryNotes, logCall, getCalls, logVisit, getVisits,
} from '../controllers/recoveryController.js';
import { protect, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = Router();

router.use(protect);

router.get('/dashboard', requirePermission(PERMISSIONS.DASHBOARD_RECOVERY, PERMISSIONS.RECOVERY_VIEW), getRecoveryDashboard);
router.get('/cases', requirePermission(PERMISSIONS.RECOVERY_VIEW), getRecoveryCases);
router.post('/cases', requirePermission(PERMISSIONS.RECOVERY_MANAGE), createRecoveryCase);
router.put('/cases/:id', requirePermission(PERMISSIONS.RECOVERY_MANAGE), updateRecoveryCase);
router.post('/cases/:id/notes', requirePermission(PERMISSIONS.RECOVERY_MANAGE), addRecoveryNote);
router.get('/cases/:id/notes', requirePermission(PERMISSIONS.RECOVERY_VIEW), getRecoveryNotes);
router.post('/calls', requirePermission(PERMISSIONS.RECOVERY_MANAGE), logCall);
router.get('/calls', requirePermission(PERMISSIONS.RECOVERY_VIEW), getCalls);
router.post('/visits', requirePermission(PERMISSIONS.RECOVERY_MANAGE), logVisit);
router.get('/visits', requirePermission(PERMISSIONS.RECOVERY_VIEW), getVisits);

export default router;
