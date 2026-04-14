import { Schema, model } from 'mongoose';
import { ADMIN_ROLE_VALUES, IAdmin } from './admin.interface';

const adminSchema = new Schema<IAdmin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: [...ADMIN_ROLE_VALUES],
      required: true,
    },
    profileImage: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
      required: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    nid: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    joinDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reportsTo: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

adminSchema.index({ isDeleted: 1, isActive: 1 });

export const Admin = model<IAdmin>('Admin', adminSchema);
