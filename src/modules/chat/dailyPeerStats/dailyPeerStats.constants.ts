/** Calendar day boundary for daily peer stats (YYYY-MM-DD keys). */
export const DAILY_PEER_STATS_TIMEZONE =
  process.env.CHAT_STATS_TIMEZONE?.trim() || 'Asia/Dhaka';

export const DAILY_PEER_STATS_DEFAULT_DAYS = 30;
export const DAILY_PEER_STATS_MAX_DAYS = 90;
