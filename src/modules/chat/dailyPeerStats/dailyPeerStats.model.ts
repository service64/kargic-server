import { Schema, model } from 'mongoose';
import type { IUserDailyPeerStatsDoc } from './dailyPeerStats.interface';

const userDailyPeerStatsSchema = new Schema<IUserDailyPeerStatsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, trim: true },
    uniquePeerCount: { type: Number, required: true, default: 0, min: 0 },
    updatedAt: { type: Date },
  },
  { timestamps: false },
);

userDailyPeerStatsSchema.index({ userId: 1, date: 1 }, { unique: true });
userDailyPeerStatsSchema.index({ date: 1 });

export const UserDailyPeerStatsModel = model<IUserDailyPeerStatsDoc>(
  'UserDailyPeerStats',
  userDailyPeerStatsSchema,
);
