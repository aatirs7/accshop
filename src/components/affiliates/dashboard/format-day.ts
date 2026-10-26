// Day-key display helpers. Day keys (YYYY-MM-DD) are calendar dates with no
// timezone, so they are always formatted in UTC to avoid shifting a day.

function toUtcDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Oct 20" */
export function shortDay(dayKey: string): string {
  return toUtcDate(dayKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Mon, Oct 20, 2026" */
export function longDay(dayKey: string): string {
  return toUtcDate(dayKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "8:00 PM" from "20:00". */
export function clockTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
