import mongoose from 'mongoose';

const callHistorySchema = new mongoose.Schema(
  {
    recoveryCase: { type: mongoose.Schema.Types.ObjectId, ref: 'RecoveryCase', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phoneNumber: String,
    callDuration: { type: Number, default: 0 },
    outcome: {
      type: String,
      enum: ['answered', 'no_answer', 'busy', 'wrong_number', 'promised_payment', 'refused', 'other'],
      default: 'no_answer',
    },
    notes: { type: String, default: '' },
    callDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CallHistory = mongoose.model('CallHistory', callHistorySchema);
export default CallHistory;
