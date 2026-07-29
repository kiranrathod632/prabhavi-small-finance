import { Router } from 'express';
import {
  getAdmins, createAdmin, updateAdmin, deleteAdmin,
  activateAdmin, deactivateAdmin, resetAdminPassword,
  assignUserToAdmin, getAdminStats,
} from '../controllers/adminController.js';
import { protect, authorize, requirePermission } from '../middlewares/auth.js';
import { PERMISSIONS, ROLES } from '../config/permissions.js';

const router = Router();

router.use(protect);

// User assignment
router.put('/users/:userId/assign', authorize(ROLES.SUPER_ADMIN), assignUserToAdmin);

// Super Admin — admin management
router.get('/', authorize(ROLES.SUPER_ADMIN), getAdmins);
router.post('/', authorize(ROLES.SUPER_ADMIN), createAdmin);
router.get('/:id/stats', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAdminStats);
router.put('/:id/activate', authorize(ROLES.SUPER_ADMIN), activateAdmin);
router.put('/:id/deactivate', authorize(ROLES.SUPER_ADMIN), deactivateAdmin);
router.put('/:id/reset-password', authorize(ROLES.SUPER_ADMIN), resetAdminPassword);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), updateAdmin);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteAdmin);

export default router;
