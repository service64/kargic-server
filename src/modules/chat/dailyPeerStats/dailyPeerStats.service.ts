import { Types } from 'mongoose';
import {
  DAILY_PEER_STATS_DEFAULT_DAYS,
  DAILY_PEER_STATS_MAX_DAYS,
  DAILY_PEER_STATS_TIMEZONE,
} from './dailyPeerStats.constants';
import { listDateKeysForLastDays, toDateKey } from './dailyPeerStats.date';
import type { DailyPeerAnalyticsResult, DailyPeerStatsDayRow } from './dailyPeerStats.interface';
import { UserDailyPeerStatsModel } from './dailyPeerStats.model';
import { UserDailyPeerTouchModel } from './dailyPeerTouch.model';

const toOid = (id: string) => new Types.ObjectId(id);

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: number }).code === 11000;

/**
 * Record one sender → peer touch for today (message sent by `userId` to `peerUserId`).
 * Idempotent per (userId, date, peerUserId). Same pair + same day = one count only.
 */
const recordSenderPeerTouch = async (
  userId: string,
  peerUserId: string,
  dateKey: string,
): Promise<void> => {
  const now = new Date();
  const userOid = toOid(userId);
  const peerOid = toOid(peerUserId);

  try {
    const touch = await UserDailyPeerTouchModel.updateOne(
      { userId: userOid, date: dateKey, peerUserId: peerOid },
      {
        $setOnInsert: { firstActivityAt: now },
        $set: { lastActivityAt: now },
      },
      { upsert: true },
    );

    const isNewTouch =
      Boolean(touch.upsertedCount) ||
      (touch.upsertedId != null && touch.matchedCount === 0);

    if (!isNewTouch) {
      return;
    }

    await UserDailyPeerStatsModel.updateOne(
      { userId: userOid, date: dateKey },
      {
        $inc: { uniquePeerCount: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { userId: userOid, date: dateKey },
      },
      { upsert: true },
    ).exec();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return;
    }
    throw err;
  }
};

/**
 * When a message is sent, only the sender accrues a daily unique peer (the receiver).
 * Example: A → B and A → C on the same day → A's uniquePeerCount = 2 (not 4).
 */
export const recordSenderPeerActivity = async (
  senderId: string,
  receiverId: string,
): Promise<void> => {
  if (senderId === receiverId) {
    return;
  }
  const dateKey = toDateKey(new Date());
  await recordSenderPeerTouch(senderId, receiverId, dateKey);
};

const fillSeries = (
  dateKeys: string[],
  countByDate: Map<string, number>,
): DailyPeerStatsDayRow[] =>
  dateKeys.map((date) => ({
    date,
    uniquePeerCount: countByDate.get(date) ?? 0,
  }));

const getDailyPeerAnalytics = async (opts?: {
  days?: number;
  userId?: string;
}): Promise<DailyPeerAnalyticsResult> => {
  const days = Math.min(
    DAILY_PEER_STATS_MAX_DAYS,
    Math.max(1, Math.floor(opts?.days ?? DAILY_PEER_STATS_DEFAULT_DAYS)),
  );
  const dateKeys = listDateKeysForLastDays(days);
  const startDate = dateKeys[0]!;
  const endDate = dateKeys[dateKeys.length - 1]!;

  let countByDate = new Map<string, number>();

  if (opts?.userId) {
    const rows = await UserDailyPeerStatsModel.find({
      userId: toOid(opts.userId),
      date: { $gte: startDate, $lte: endDate },
    })
      .select('date uniquePeerCount')
      .lean()
      .exec();

    countByDate = new Map(
      rows.map((r) => [r.date, Math.max(0, Number(r.uniquePeerCount) || 0)]),
    );
  } else {
    // Platform-wide: count unique (sender, receiver) pairs per day — do not sum per-user stats.
    const grouped = await UserDailyPeerTouchModel.aggregate<{
      _id: string;
      uniquePeerCount: number;
    }>([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$date', uniquePeerCount: { $sum: 1 } } },
    ]).exec();

    countByDate = new Map(
      grouped.map((g) => [g._id, Math.max(0, Number(g.uniquePeerCount) || 0)]),
    );
  }

  const series = fillSeries(dateKeys, countByDate);
  const todayKey = toDateKey(new Date());
  const todayRow = series.find((r) => r.date === todayKey) ?? {
    date: todayKey,
    uniquePeerCount: countByDate.get(todayKey) ?? 0,
  };

  return {
    timezone: DAILY_PEER_STATS_TIMEZONE,
    ...(opts?.userId ? { userId: opts.userId } : {}),
    today: todayRow,
    days,
    series,
  };
};

export const DailyPeerStatsService = {
  recordSenderPeerActivity,
  getDailyPeerAnalytics,
};
