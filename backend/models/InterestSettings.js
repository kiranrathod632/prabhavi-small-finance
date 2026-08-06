import mongoose from 'mongoose';

const interestSettingsSchema = new mongoose.Schema(
  {
    // Singleton settings document
    isActive: { type: Boolean, default: true },
    interestType: {
      type: String,
      enum: ['flat', 'reducing_balance'],
      default: 'reducing_balance',
    },
    interestRatePeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'yearly',
    },
    defaultInterestRate: { type: Number, default: 18, min: 0, max: 100 },
    processingFeeType: {
      type: String,
      enum: ['flat', 'percentage'],
      default: 'flat',
    },
    processingFeeValue: { type: Number, default: 1100, min: 0 },
    processingFeePercent: { type: Number, default: 0, min: 0, max: 100 },
    gstEnabled: { type: Boolean, default: true },
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },
    latePaymentPenalty: { type: Number, default: 500, min: 0 },
    dailyPenaltyRate: { type: Number, default: 0, min: 0 },
    penaltyEnabled: { type: Boolean, default: true },
    bounceCharge: { type: Number, default: 250, min: 0 },
    prepaymentCharge: { type: Number, default: 0, min: 0 },
    prepaymentChargePercent: { type: Number, default: 2, min: 0, max: 100 },
    foreclosureCharge: { type: Number, default: 0, min: 0 },
    foreclosureChargePercent: { type: Number, default: 3, min: 0, max: 100 },
    allowedTenures: {
      type: [Number],
      default: [6, 9, 12, 18, 24, 36, 48, 60],
    },
    customTenureAllowed: { type: Boolean, default: true },
    minLoanAmount: { type: Number, default: 1000 },
    maxLoanAmount: { type: Number, default: 5000000 },
    loanTypeRates: {
      personal: { type: Number, default: 18 },
      home: { type: Number, default: 10 },
      business: { type: Number, default: 20 },
      education: { type: Number, default: 12 },
      vehicle: { type: Number, default: 14 },
    },
    /** Global rate Super Admin sets for Admin commission on approved loans */
    adminCommissionRate: { type: Number, default: 2, min: 0, max: 100 },
    /** After Super Admin sets rate once, locked until they unlock */
    adminCommissionRateLocked: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const InterestSettings = mongoose.model('InterestSettings', interestSettingsSchema);
export default InterestSettings;
