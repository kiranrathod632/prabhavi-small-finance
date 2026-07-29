import { Router } from 'express';
import { sendOtp, verifyOtpCode, resendOtp } from '../controllers/otpController.js';
import { validate } from '../middlewares/validate.js';
import { body } from 'express-validator';

const router = Router();

router.post('/send', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid mobile required'),
], validate, sendOtp);

router.post('/verify', [
  body('mobile').matches(/^[6-9]\d{9}$/),
  body('otp').isLength({ min: 6, max: 6 }),
], validate, verifyOtpCode);

router.post('/resend', [
  body('mobile').matches(/^[6-9]\d{9}$/),
], validate, resendOtp);

export default router;
