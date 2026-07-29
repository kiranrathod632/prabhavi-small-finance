import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
    emi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMI',
    },
    paymentId: {
      type: String,
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: 0,
    },
    type: {
      type: String,
      enum: ['emi', 'penalty', 'partial', 'full_settlement'],
      default: 'emi',
    },
    method: {
      type: String,
      enum: ['wallet', 'bank_transfer', 'upi', 'cash', 'cheque', 'online'],
      default: 'wallet',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    receiptNumber: String,
    receiptUrl: String,
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    remarks: String,
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function () {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY${String(count + 1).padStart(8, '0')}`;
    this.receiptNumber = `RCP${String(count + 1).padStart(8, '0')}`;
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
