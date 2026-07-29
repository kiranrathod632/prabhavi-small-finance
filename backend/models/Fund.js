import mongoose from 'mongoose';

const fundSchema = new mongoose.Schema(
  {
    companyFund: { type: Number, required: true, default: 0, min: 0 },
    openingBalance: { type: Number, default: 0, min: 0 },
    availableFund: { type: Number, required: true, default: 0, min: 0 },
    cashInHand: { type: Number, default: 0, min: 0 },
    bankBalance: { type: Number, default: 0, min: 0 },
    loanDistributed: { type: Number, default: 0, min: 0 },
    loanReturned: { type: Number, default: 0, min: 0 },
    emiCollected: { type: Number, default: 0, min: 0 },
    interestEarned: { type: Number, default: 0, min: 0 },
    penaltyEarned: { type: Number, default: 0, min: 0 },
    processingFeeEarned: { type: Number, default: 0, min: 0 },
    expenses: { type: Number, default: 0, min: 0 },
    profit: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    history: [{
      type: {
        type: String,
        enum: [
          'deposit', 'withdrawal', 'loan_disbursement', 'emi_collection',
          'expense', 'processing_fee', 'penalty_collection', 'interest_collection',
          'fund_transfer', 'adjustment',
        ],
      },
      amount: Number,
      description: String,
      fromAccount: String,
      toAccount: String,
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

const Fund = mongoose.model('Fund', fundSchema);
export default Fund;
