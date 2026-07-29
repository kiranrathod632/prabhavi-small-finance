import mongoose from 'mongoose';
import { softDeletePlugin } from '../utils/softDeletePlugin.js';

const commissionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    loanAmount: { type: Number, required: true, min: 0 },
    commissionPercentage: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
    paidAt: Date,
    remarks: String,
  },
  { timestamps: true }
);

commissionSchema.plugin(softDeletePlugin);

const Commission = mongoose.model('Commission', commissionSchema);
export default Commission;
