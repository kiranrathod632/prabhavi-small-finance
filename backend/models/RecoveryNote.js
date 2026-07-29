import mongoose from 'mongoose';

const recoveryNoteSchema = new mongoose.Schema(
  {
    recoveryCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecoveryCase',
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    type: {
      type: String,
      enum: ['general', 'call', 'visit', 'promise', 'payment', 'escalation'],
      default: 'general',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const RecoveryNote = mongoose.model('RecoveryNote', recoveryNoteSchema);
export default RecoveryNote;
