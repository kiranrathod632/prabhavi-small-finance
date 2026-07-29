import mongoose from 'mongoose';

const visitHistorySchema = new mongoose.Schema(
  {
    recoveryCase: { type: mongoose.Schema.Types.ObjectId, ref: 'RecoveryCase', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    visitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    address: { type: String, default: '' },
    visitDate: { type: Date, default: Date.now },
    outcome: {
      type: String,
      enum: ['met_customer', 'not_available', 'wrong_address', 'promised_payment', 'partial_payment', 'refused', 'other'],
      default: 'not_available',
    },
    notes: { type: String, default: '' },
    amountCollected: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const VisitHistory = mongoose.model('VisitHistory', visitHistorySchema);
export default VisitHistory;
