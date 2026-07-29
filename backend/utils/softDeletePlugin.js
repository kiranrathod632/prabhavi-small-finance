import mongoose from 'mongoose';

/**
 * Mongoose plugin for soft delete support
 */
export const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.statics.findActive = function (filter = {}) {
    return this.find({ ...filter, isDeleted: { $ne: true } });
  };

  schema.statics.findOneActive = function (filter = {}) {
    return this.findOne({ ...filter, isDeleted: { $ne: true } });
  };

  schema.methods.softDelete = async function (deletedBy) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedBy) this.deletedBy = deletedBy;
    return this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
};
