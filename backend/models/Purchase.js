import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    billPhoto: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    fundHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

purchaseSchema.index({ status: 1, createdAt: -1 });
purchaseSchema.index({ requestedBy: 1, createdAt: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
