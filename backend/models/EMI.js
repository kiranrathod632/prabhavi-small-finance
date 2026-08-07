import mongoose from 'mongoose';
import { softDeletePlugin } from '../utils/softDeletePlugin.js';

const emiSchema = new mongoose.Schema(
  {
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emiNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'EMI amount is required'],
      min: 0,
    },
    principal: { type: Number, default: 0 },
    interest: { type: Number, default: 0 },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'partial', 'failed', 'pending_collection'],
      default: 'pending',
    },
    penalty: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    dailyPenalty: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    receiptNumber: String,
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online', 'wallet'],
    },
    referenceNumber: String,
    penaltyAppliedAt: Date,
    reminderSmsSentAt: Date,
    // Voice reminder slots (2 days before due): 11 AM / 6 PM IST
    reminderCallMorningSentAt: Date,
    reminderCallEveningSentAt: Date,
    remarks: String,
  },
  { timestamps: true }
);

emiSchema.plugin(softDeletePlugin);

emiSchema.pre('save', function () {
  if (this.isNew || this.isModified('amount') || this.isModified('paidAmount') || this.isModified('penalty')) {
    const totalDue = (this.amount || 0) + (this.penalty || 0) + (this.lateFee || 0) + (this.dailyPenalty || 0);
    this.pendingAmount = Math.max(0, totalDue - (this.paidAmount || 0));
  }
});

emiSchema.index({ loan: 1, emiNumber: 1 });
emiSchema.index({ user: 1, status: 1 });
emiSchema.index({ dueDate: 1 });

const EMI = mongoose.model('EMI', emiSchema);
export default EMI;
