import { Router } from 'express';
import {
  register, registerMobile, completeProfile, login, logout, refreshToken, forgotPassword, resetPassword, resetPasswordWithOtp,
  verifyResetOtp, changePassword, getMe, sendLoginOtp, listPublicAdmins, saveFcmToken, removeFcmToken,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  registerValidator, mobileRegisterValidator, completeProfileValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator,
  resetPasswordOtpValidator, changePasswordValidator,
} from '../validators/index.js';

const router = Router();

router.get('/admins', listPublicAdmins);
router.post('/register', registerValidator, validate, register);
router.post('/register-mobile', mobileRegisterValidator, validate, registerMobile);
router.put('/complete-profile', protect, completeProfileValidator, validate, completeProfile);
router.post('/login', loginValidator, validate, login);
router.post('/send-login-otp', sendLoginOtp);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password-otp', resetPasswordOtpValidator, validate, resetPasswordWithOtp);
router.post('/reset-password/:token', resetPasswordValidator, validate, resetPassword);
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);
router.get('/me', protect, getMe);
router.post('/fcm-token', protect, saveFcmToken);
router.delete('/fcm-token', protect, removeFcmToken);

export default router;
