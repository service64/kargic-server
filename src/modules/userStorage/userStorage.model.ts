import { Schema, model } from 'mongoose';
import { IUserStorage } from './userStorage.interface';
import {
  PACKAGE_TYPES,
  STORAGE_LIMIT_MB_VALUES,
  PACKAGE_STORAGE_LIMIT_MB,
} from '../../type/common.type';

const userStorageSchema = new Schema<IUserStorage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    package: {
      type: String,
      enum: PACKAGE_TYPES,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'UNPAID'],
      required: false,
    },
    paymentDate: {
      type: Date,
      required: false,
    },
    paymentAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CARD', 'PAYPAL', 'STRIPE'],
      required: false,
    },
    storage: {
      used: {
        type: Number,
        default: 0,
        min: 0,
      },
      limit: {
        type: Number,
        enum: STORAGE_LIMIT_MB_VALUES,
        default: PACKAGE_STORAGE_LIMIT_MB.FREE,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const UserStorage = model<IUserStorage>('UserStorage', userStorageSchema);
