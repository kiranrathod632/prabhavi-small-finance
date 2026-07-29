import mongoose from 'mongoose';
import { softDeletePlugin } from '../utils/softDeletePlugin.js';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: [
        'credit', 'debit', 'emi_payment', 'loan_disbursement', 'penalty', 'refund',
        'processing_fee', 'loan_credit', 'emi_credit', 'manual_entry', 'adjustment',
        'interest_collection', 'principal_collection', 'gst_collection',
      ],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    description: { type: String, default: '' },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    emi: { type: mongoose.Schema.Types.ObjectId, ref: 'EMI' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed', 'refunded'],
      default: 'completed',
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'bank_transfer', 'upi', 'cash', 'cheque', 'online'],
      default: 'wallet',
    },
    referenceNumber: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

transactionSchema.plugin(softDeletePlugin);

transactionSchema.pre('save', async function () {
  if (!this.transactionId) {
    const count = await mongoose.model('Transaction').countDocuments();
    this.transactionId = `TXN${String(count + 1).padStart(8, '0')}`;
  }
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
