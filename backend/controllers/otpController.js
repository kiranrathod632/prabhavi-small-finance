import { createOtp, verifyOtp } from '../services/otpService.js';
import { sendOtpSms } from '../services/smsService.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';

/**
 * @route   POST /api/otp/send
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, purpose = 'registration' } = req.body;

  const otp = await createOtp(mobile, purpose);
  const smsResult = await sendOtpSms(mobile, otp, purpose);
  const isDev = process.env.NODE_ENV === 'development';

  if (!smsResult.success && !isDev) {
    return sendError(res, 502, `Unable to send OTP: ${smsResult.error}`);
  }

  if (!smsResult.success && isDev) {
    console.warn(`[DEV] SMS failed (${smsResult.error}). OTP for ${mobile}: ${otp}`);
  }

  sendResponse(
    res,
    200,
    smsResult.success ? 'OTP sent successfully' : 'OTP generated (development mode)',
    {
      mobile,
      expiresIn: 600,
      ...(isDev && { otp }),
      ...(!smsResult.success && isDev && { smsSkipped: true }),
    }
  );
});

/**
 * @route   POST /api/otp/verify
 */
export const verifyOtpCode = asyncHandler(async (req, res) => {
  const { mobile, otp, purpose = 'registration' } = req.body;

  const result = await verifyOtp(mobile, otp, purpose);
  if (!result.valid) {
    return sendError(res, 400, result.message);
  }

  sendResponse(res, 200, 'OTP verified successfully', { mobile, verified: true });
});

/**
 * @route   POST /api/otp/resend
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { mobile, purpose = 'registration' } = req.body;

  const otp = await createOtp(mobile, purpose);
  const smsResult = await sendOtpSms(mobile, otp, purpose);
  const isDev = process.env.NODE_ENV === 'development';

  if (!smsResult.success && !isDev) {
    return sendError(res, 502, `Unable to send OTP: ${smsResult.error}`);
  }

  if (!smsResult.success && isDev) {
    console.warn(`[DEV] SMS failed (${smsResult.error}). OTP for ${mobile}: ${otp}`);
  }

  sendResponse(
    res,
    200,
    smsResult.success ? 'OTP resent successfully' : 'OTP regenerated (development mode)',
    {
      ...(isDev && { otp }),
      ...(!smsResult.success && isDev && { smsSkipped: true }),
    }
  );
});
