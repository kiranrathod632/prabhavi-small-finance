import { Router } from 'express';
import {
  submitKyc, getKycStatus, getPendingKyc, reviewKyc,
} from '../controllers/kycController.js';
import { protect, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import { mongoIdValidator } from '../validators/index.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(protect);

router.post('/submit', submitKyc);
router.get('/status', getKycStatus);
router.get('/pending', requirePermission(PERMISSIONS.KYC_MANAGE), getPendingKyc);
router.put('/:userId/review', requirePermission(PERMISSIONS.KYC_MANAGE), mongoIdValidator, validate, reviewKyc);

export default router;
