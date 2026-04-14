/** Parses JWT-style `expiresIn` strings like `7d`, `24h`, `3600` (seconds) to milliseconds. */
export const jwtDurationToMs = (input: string): number => {
  const s = String(input).trim();
  const numOnly = /^\d+$/.exec(s);
  if (numOnly) {
    return parseInt(numOnly[0], 10) * 1000;
  }
  const m = s.match(/^(\d+)([smhdw])$/i);
  if (!m) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return n * (mult[unit] ?? 86_400_000);
};
