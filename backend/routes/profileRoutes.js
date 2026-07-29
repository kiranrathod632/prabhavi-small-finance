import { Router } from 'express';
import {
  getProfile, updateProfile, uploadAvatar, uploadDocument,
} from '../controllers/profileController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileValidator } from '../validators/index.js';
import { uploadSingle } from '../middlewares/upload.js';

const router = Router();

router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfileValidator, validate, updateProfile);
router.post('/avatar', uploadSingle('avatar'), uploadAvatar);
router.post('/documents', uploadSingle('document'), uploadDocument);

export default router;
