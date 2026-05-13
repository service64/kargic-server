import { Schema, model } from 'mongoose';
import type { IUserBlockDoc } from './userBlock.interface';

const userBlockSchema = new Schema<IUserBlockDoc>(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const UserBlockModel = model<IUserBlockDoc>('UserBlock', userBlockSchema);
