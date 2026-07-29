import Otp from '../models/Otp.js';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generate 6-digit OTP
 */
export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Create and store OTP
 */
export const createOtp = async (mobile, purpose = 'registration') => {
  // Invalidate previous OTPs
  await Otp.deleteMany({ mobile, purpose, isVerified: false });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({ mobile, otp, purpose, expiresAt });

  return otp;
};

/**
 * Verify OTP
 */
export const verifyOtp = async (mobile, otp, purpose = 'registration') => {
  const record = await Otp.findOne({
    mobile,
    purpose,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (!record) {
    return { valid: false, message: 'OTP expired or not found' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, message: 'Maximum OTP attempts exceeded' };
  }

  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    return { valid: false, message: 'Invalid OTP' };
  }

  record.isVerified = true;
  await record.save();
  return { valid: true };
};
