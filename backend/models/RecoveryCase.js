import mongoose from 'mongoose';

const recoveryCaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    emi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EMI',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'contacted', 'promised', 'partial_paid', 'recovered', 'failed', 'escalated'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    overdueAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    daysOverdue: { type: Number, default: 0 },
    lastContactDate: Date,
    nextFollowUpDate: Date,
    recoveryNotes: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const RecoveryCase = mongoose.model('RecoveryCase', recoveryCaseSchema);
export default RecoveryCase;
