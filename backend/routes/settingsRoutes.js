import { Router } from 'express';
import {
  getInterestSettings, updateInterestSettings, calculateEmiPreview,
} from '../controllers/settingsController.js';
import { protect, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS } from '../config/permissions.js';

const router = Router();

router.get('/', getInterestSettings);
router.post('/calculate-emi', calculateEmiPreview);

router.use(protect);
router.put('/', requirePermission(PERMISSIONS.SETTINGS_MANAGE), updateInterestSettings);

export default router;
