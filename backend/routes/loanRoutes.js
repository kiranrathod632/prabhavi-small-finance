import { Router } from 'express';
import {
  createLoan, getLoans, getLoan, updateLoan, deleteLoan, downloadLoanStatement, exportLoans,
  selectLoanTenure, calculateLoanEmi,
} from '../controllers/loanController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createLoanValidator, updateLoanValidator, mongoIdValidator, paginationValidator,
} from '../validators/index.js';

const router = Router();

router.use(protect);

router.post('/calculate', calculateLoanEmi);
router.get('/export/excel', authorize('admin'), exportLoans);
router.post('/', createLoanValidator, validate, createLoan);
router.get('/', paginationValidator, validate, getLoans);
router.get('/:id', mongoIdValidator, validate, getLoan);
router.get('/:id/statement', mongoIdValidator, validate, downloadLoanStatement);
router.post('/:id/select-tenure', mongoIdValidator, validate, selectLoanTenure);
router.put('/:id', mongoIdValidator, updateLoanValidator, validate, updateLoan);
router.delete('/:id', mongoIdValidator, validate, deleteLoan);

export default router;
