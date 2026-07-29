import { Router } from 'express';
import {
  getEMIs, getEMI, payEMI, updateEMI, downloadReceipt, createEMI,
} from '../controllers/emiController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  payEMIValidator, mongoIdValidator, paginationValidator,
} from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/', paginationValidator, validate, getEMIs);
router.post('/pay', payEMIValidator, validate, payEMI);
router.post('/', authorize('admin'), createEMI);
router.get('/:id', mongoIdValidator, validate, getEMI);
router.get('/:id/receipt', mongoIdValidator, validate, downloadReceipt);
router.put('/:id', mongoIdValidator, authorize('admin'), updateEMI);

export default router;
