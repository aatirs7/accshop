// Day-key helpers for the Daily Operations workspace. A "day key" is a plain
// local calendar date as `YYYY-MM-DD` — no timezone, no time component — so the
// same string the owner sees is the one stored and compared in the database.

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_RE.test(value);
}

/** Today's calendar date in the viewer's local timezone, as YYYY-MM-DD. */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a day key by whole days (negative = earlier), timezone-safe. */
export function shiftDay(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** "Monday, 18 October 2026" for display. */
export function prettyDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A short relative label ("Today" / "Yesterday" / "Tomorrow") or "". */
export function relativeDay(dayKey: string, today: string): string {
  if (dayKey === today) return "Today";
  if (dayKey === shiftDay(today, -1)) return "Yesterday";
  if (dayKey === shiftDay(today, 1)) return "Tomorrow";
  return "";
}
