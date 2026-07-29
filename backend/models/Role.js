import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      enum: ['super_admin', 'admin', 'user'],
      lowercase: true,
    },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Role = mongoose.model('Role', roleSchema);
export default Role;
