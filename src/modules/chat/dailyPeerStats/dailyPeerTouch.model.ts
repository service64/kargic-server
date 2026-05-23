import { Schema, model } from 'mongoose';
import type { IUserDailyPeerTouchDoc } from './dailyPeerStats.interface';

const userDailyPeerTouchSchema = new Schema<IUserDailyPeerTouchDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, trim: true },
    peerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstActivityAt: { type: Date },
    lastActivityAt: { type: Date },
  },
  { timestamps: false },
);

userDailyPeerTouchSchema.index(
  { userId: 1, date: 1, peerUserId: 1 },
  { unique: true },
);
userDailyPeerTouchSchema.index({ date: 1 });
userDailyPeerTouchSchema.index({ userId: 1, date: 1 });

export const UserDailyPeerTouchModel = model<IUserDailyPeerTouchDoc>(
  'UserDailyPeerTouch',
  userDailyPeerTouchSchema,
);
