import mongoose from 'mongoose';
import { softDeletePlugin } from '../utils/softDeletePlugin.js';

const loanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    loanId: {
      type: String,
    },
    loanType: {
      type: String,
      enum: ['personal', 'home', 'business', 'education', 'vehicle'],
      required: [true, 'Loan type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [1000, 'Minimum loan amount is ₹1,000'],
    },
    approvedAmount: {
      type: Number,
      min: [0, 'Approved amount cannot be negative'],
    },
    emiStartDate: Date,
    dueDate: Date,
    interestRate: {
      type: Number,
      default: 0,
      min: [0, 'Interest rate cannot be negative'],
      max: [50, 'Interest rate cannot exceed 50%'],
    },
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
    tenure: {
      type: Number,
      min: [1, 'Minimum tenure is 1 month'],
      max: [360, 'Maximum tenure is 360 months'],
    },
    selectedTenure: { type: Number },
    tenureSelectedAt: Date,
    emiAmount: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    totalInterest: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    // Processing fee breakup
    processingFee: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    netDisbursedAmount: { type: Number, default: 0 },
    processingFeeDeductedAt: Date,
    status: {
      type: String,
      enum: [
        'draft', 'pending', 'under_review', 'approved', 'rejected',
        'disbursed', 'active', 'closed', 'defaulted', 'cancelled',
      ],
      default: 'pending',
    },
    // purpose: {
    //   type: String,
    //   required: [true, 'Loan purpose is required'],
    //   maxlength: [500, 'Purpose cannot exceed 500 characters'],
    // },
    documents: [{
      name: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedReason: String,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    disbursedAt: Date,
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disbursedAmount: { type: Number, default: 0 },
    closedAt: Date,
    cancelledAt: Date,
    cancelledReason: String,
    startDate: Date,
    endDate: Date,
    paidEmis: { type: Number, default: 0 },
    totalEmis: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    remarks: String,
    amortizationSchedule: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

loanSchema.plugin(softDeletePlugin);

loanSchema.pre('save', async function () {
  if (!this.loanId) {
    const count = await mongoose.model('Loan').countDocuments();
    this.loanId = `LN${String(count + 1).padStart(6, '0')}`;
  }
});

// loanSchema.index({ user: 1, status: 1 });
// Add this after your schema definition
loanSchema.index({ loanId: 1 }, { unique: true, sparse: true });

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
