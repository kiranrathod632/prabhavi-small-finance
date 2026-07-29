import { Router } from 'express';
import { getAdvancedReport } from '../controllers/reportController.js';
import { protect, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = Router();

router.use(protect, requirePermission(PERMISSIONS.REPORTS_VIEW));

router.get('/:type', getAdvancedReport);

export default router;
