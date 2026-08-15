// models/Profile.js
import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator(value) {
          if (value === undefined || value === null || value === '') return true;
          return /^[0-9]{10}$/.test(value);
        },
        message: 'Phone number must be 10 digits',
      },
    },
    alternatePhone: {
      type: String,
      trim: true,
      validate: {
        validator(value) {
          if (value === undefined || value === null || value === '') return true;
          return /^[0-9]{10}$/.test(value);
        },
        message: 'Alternate phone number must be 10 digits',
      },
    },
    pan: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please provide a valid PAN number"],
    },
    aadhaar: {
      type: String,
      trim: true,
      match: [/^[0-9]{12}$/, "Aadhaar must be 12 digits"],
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, match: [/^[0-9]{6}$/, "Pincode must be 6 digits"] },
      country: { type: String, default: 'India' },
    },
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, uppercase: true, trim: true },
      bankName: { type: String, trim: true },
    },
    nominee: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    aadhaarDocument: {
      type: String,
      trim: true,
      default: '',
    },
    panDocument: {
      type: String,
      trim: true,
      default: '',
    },
    bankDocument: {
      type: String,
      trim: true,
      default: '',
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Remove softDeletePlugin if it's causing issues
// If you need soft delete, implement manually:
profileSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Pre-save middleware to update profileCompleted (Mongoose 9: sync hooks have no next())
profileSchema.pre('save', function () {
  const requiredFields = [
    this.phone,
    this.pan,
    this.aadhaar,
    this.aadhaarDocument,
    this.panDocument,
    this.bankDocument,
  ];

  this.profileCompleted = requiredFields.every(
    (field) => field !== undefined && field !== null && field !== ''
  );
});

// unique: true on user already creates the index — do not also call schema.index({ user: 1 })
const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
