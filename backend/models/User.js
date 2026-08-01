// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    mobile_number: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, "Mobile number must be 10 digits"],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    registrationMethod: {
      type: String,
      enum: ['email', 'mobile'],
      default: 'email',
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'recovery_agent', 'user'],
      default: 'user',
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permissions: [{
      type: String,
    }],
    commissionRate: {
      type: Number,
      default: 2,
      min: 0,
      max: 100,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'mr'],
      default: 'en',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    kycCompleted: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    otp: {
      type: String,
      select: false,
    },
    otp_expiry: {
      type: Date,
      select: false,
    },
    is_otp_verified: {
      type: Boolean,
      default: false,
      select: false,
    },
    lastLogin: Date,
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedRecoveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    profileSetupComplete: {
      type: Boolean,
      default: true,
    },
    fcmTokens: {
      type: [
        {
          token: { type: String, required: true },
          platform: { type: String, enum: ['web', 'android', 'ios', 'mobile'], default: 'web' },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

const composeFullName = (firstName, middleName, lastName) =>
  [firstName, middleName, lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');

// Keep legacy `name` in sync when name parts are updated
userSchema.pre('save', function () {
  if (
    this.isModified('firstName') ||
    this.isModified('middleName') ||
    this.isModified('lastName')
  ) {
    const composed = composeFullName(this.firstName, this.middleName, this.lastName);
    if (composed) this.name = composed;
  }
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add method to get credential (email or mobile)
userSchema.methods.getCredential = function() {
  return this.email || this.mobile_number;
};

// Add static method to find by credential
userSchema.statics.findByCredential = async function(credential) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);
  const isMobile = /^[0-9]{10}$/.test(credential);
  
  if (isEmail) {
    return await this.findOne({ 
      email: credential.toLowerCase(), 
      isDeleted: { $ne: true } 
    });
  } else if (isMobile) {
    return await this.findOne({ 
      $or: [
        { mobile_number: credential },
        { mobile: credential } // Keep for backward compatibility
      ],
      isDeleted: { $ne: true } 
    });
  }
  return null;
};

// Soft delete method
userSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Restore soft deleted user
userSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.otp;
  delete obj.otp_expiry;
  delete obj.fcmTokens;
  return obj;
};

// Add indexes - Remove duplicate index definitions
// Only use schema.index() here, not "index: true" in field definitions
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ mobile_number: 1, isDeleted: 1 });
userSchema.index({ role: 1 });
userSchema.index({ adminId: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
export default User;