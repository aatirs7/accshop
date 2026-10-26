// LIVE stream reporting helpers. Pure functions, safe on client and server.

export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Minutes between two "HH:MM" wall-clock times. An end earlier than the start
 * means the stream ran past midnight. Returns null for malformed input or a
 * zero-length stream.
 */
export function liveDurationMinutes(start: string, end: string): number | null {
  const a = TIME_RE.exec(start);
  const b = TIME_RE.exec(end);
  if (!a || !b) return null;
  const s = Number(a[1]) * 60 + Number(a[2]);
  const e = Number(b[1]) * 60 + Number(b[2]);
  const mins = e >= s ? e - s : e + 24 * 60 - s;
  return mins > 0 ? mins : null;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Monday..Sunday of the week containing `dayKey` (YYYY-MM-DD), as day keys. */
export function weekBounds(dayKey: string): { start: string; end: string } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(dt);
  start.setUTCDate(dt.getUTCDate() - dow);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const key = (x: Date) => x.toISOString().slice(0, 10);
  return { start: key(start), end: key(end) };
}
