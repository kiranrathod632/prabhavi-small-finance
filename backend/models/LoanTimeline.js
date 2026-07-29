import mongoose from 'mongoose';

const loanTimelineSchema = new mongoose.Schema(
  {
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

loanTimelineSchema.index({ loan: 1, createdAt: 1 });

const LoanTimeline = mongoose.model('LoanTimeline', loanTimelineSchema);
export default LoanTimeline;
