    import { Schema, model } from 'mongoose'; 
import { IUserStorage } from './userStorage.interface';
import { PACKAGE_TYPES } from '../../type/common.type';

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
    storage: {
      used: {
        type: Number,
        default: 0,
        min: 0, 
      },
      limit: {
        type: Number,
        default: 50,
        min: 50,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const UserStorage = model<IUserStorage>('UserStorage', userStorageSchema);
