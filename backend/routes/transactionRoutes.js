import { Router } from 'express';
import {
  getTransactions, getTransaction, createTransaction, downloadStatement, exportTransactions,
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createTransactionValidator, mongoIdValidator, paginationValidator, dateFilterValidator,
} from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/export/excel', exportTransactions);
router.get('/statement/pdf', dateFilterValidator, validate, downloadStatement);
router.get('/', paginationValidator, dateFilterValidator, validate, getTransactions);
router.get('/:id', mongoIdValidator, validate, getTransaction);
router.post('/', createTransactionValidator, validate, createTransaction);

export default router;
