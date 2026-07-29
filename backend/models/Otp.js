import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'verification', 'password_reset'],
      default: 'registration',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

otpSchema.index({ mobile: 1, purpose: 1 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
