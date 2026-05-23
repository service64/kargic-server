import { DAILY_PEER_STATS_TIMEZONE } from './dailyPeerStats.constants';

/** `YYYY-MM-DD` for the given instant in the configured timezone. */
export function toDateKey(
  date: Date,
  timeZone = DAILY_PEER_STATS_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Last `days` calendar keys ending today (inclusive), oldest first. */
export function listDateKeysForLastDays(
  days: number,
  timeZone = DAILY_PEER_STATS_TIMEZONE,
): string[] {
  const safeDays = Math.max(1, Math.floor(days));
  const keys: string[] = [];
  const anchor = new Date();
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - offset);
    keys.push(toDateKey(d, timeZone));
  }
  return keys;
}
