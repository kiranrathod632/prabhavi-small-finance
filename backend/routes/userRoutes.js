import { Router } from 'express';
import {
  getUsers, getUser, createUser, updateUser, deleteUser, exportUsers,
} from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createUserValidator, updateUserValidator, mongoIdValidator, paginationValidator,
} from '../validators/index.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/export/excel', exportUsers);
router.get('/', paginationValidator, validate, getUsers);
router.get('/:id', mongoIdValidator, validate, getUser);
router.post('/', createUserValidator, validate, createUser);
router.put('/:id', mongoIdValidator, updateUserValidator, validate, updateUser);
router.delete('/:id', mongoIdValidator, validate, deleteUser);

export default router;
