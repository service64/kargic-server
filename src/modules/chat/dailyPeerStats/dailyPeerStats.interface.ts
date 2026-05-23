import { Types } from 'mongoose';

export interface IUserDailyPeerTouchDoc {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  /** `YYYY-MM-DD` in {@link DAILY_PEER_STATS_TIMEZONE}. */
  date: string;
  peerUserId: Types.ObjectId;
  firstActivityAt?: Date;
  lastActivityAt?: Date;
}

export interface IUserDailyPeerStatsDoc {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  uniquePeerCount: number;
  updatedAt?: Date;
}

export type DailyPeerStatsDayRow = {
  date: string;
  uniquePeerCount: number;
};

export type DailyPeerAnalyticsResult = {
  timezone: string;
  /** Set when filtering a single user; omitted for platform-wide totals. */
  userId?: string;
  today: DailyPeerStatsDayRow;
  days: number;
  series: DailyPeerStatsDayRow[];
};
