import { Router } from 'express';
import { getFunds, updateFund } from '../controllers/fundController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateFundValidator } from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/', getFunds);
router.post('/', authorize('admin'), updateFundValidator, validate, updateFund);

export default router;
