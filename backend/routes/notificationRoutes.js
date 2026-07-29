import { Router } from 'express';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { mongoIdValidator, paginationValidator } from '../validators/index.js';

const router = Router();

router.use(protect);

router.get('/', paginationValidator, validate, getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', mongoIdValidator, validate, markAsRead);
router.delete('/:id', mongoIdValidator, validate, deleteNotification);

export default router;
