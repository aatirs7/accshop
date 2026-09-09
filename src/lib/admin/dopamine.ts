/**
 * Pure math behind the overview's "feel-good" widgets: today's total, the
 * daily sale streak, the best day on record, and revenue/volume milestones.
 *
 * Everything buckets by the *browser's* local day (same convention as the
 * metrics range picker), so these run on the client after mount rather than
 * on the UTC server. Inputs are compact `{ t, c, q }` points, one per paid
 * order, so the whole paid history can travel to the client cheaply.
 */

/** One paid order: `t` = paidAt ms, `c` = total cents, `q` = accounts. */
export type SalePoint = { t: number; c: number; q: number };

export type DayTotal = {
  /** Local YYYY-MM-DD. */
  key: string;
  /** Local midnight for the day. */
  start: number;
  cents: number;
  orders: number;
  accounts: number;
};

const DAY_MS = 86_400_000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DD for a timestamp. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight `offsetDays` days from the given moment. */
export function dayStart(now: number, offsetDays = 0): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
}

/** Every local day that had at least one sale, keyed by YYYY-MM-DD. */
export function totalsByDay(points: SalePoint[]): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>();
  for (const p of points) {
    const key = dayKey(p.t);
    const existing = map.get(key);
    if (existing) {
      existing.cents += p.c;
      existing.orders += 1;
      existing.accounts += p.q;
    } else {
      map.set(key, {
        key,
        start: dayStart(p.t),
        cents: p.c,
        orders: 1,
        accounts: p.q,
      });
    }
  }
  return map;
}

/** The last `days` local days (oldest first), zero-filled, ending today. */
export function recentDays(points: SalePoint[], days: number, now: number): DayTotal[] {
  const byDay = totalsByDay(points);
  const out: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = dayStart(now, -i);
    const key = dayKey(start);
    out.push(byDay.get(key) ?? { key, start, cents: 0, orders: 0, accounts: 0 });
  }
  return out;
}

export function todayTotal(points: SalePoint[], now: number): DayTotal {
  const start = dayStart(now);
  const key = dayKey(start);
  return totalsByDay(points).get(key) ?? { key, start, cents: 0, orders: 0, accounts: 0 };
}

/**
 * Consecutive days with at least one sale. Counts back from today, or from
 * yesterday if today hasn't had a sale yet, so the streak doesn't read as
 * broken first thing in the morning.
 */
export function saleStreak(points: SalePoint[], now: number): number {
  const byDay = totalsByDay(points);
  let cursor = dayStart(now);
  if (!byDay.has(dayKey(cursor))) cursor -= DAY_MS;
  let streak = 0;
  // Step by re-deriving local midnight so DST days don't drift the cursor.
  while (byDay.has(dayKey(cursor))) {
    streak += 1;
    cursor = dayStart(cursor - DAY_MS + DAY_MS / 2);
  }
  return streak;
}

/** Highest-revenue day on record, or null with no sales. */
export function bestDay(points: SalePoint[]): DayTotal | null {
  let best: DayTotal | null = null;
  for (const day of totalsByDay(points).values()) {
    if (!best || day.cents > best.cents) best = day;
  }
  return best;
}

/**
 * Whether today is the best day ever: strictly beats every other day, and
 * has real money on it.
 */
export function isRecordDay(points: SalePoint[], now: number): boolean {
  const today = todayTotal(points, now);
  if (today.cents <= 0) return false;
  for (const day of totalsByDay(points).values()) {
    if (day.key !== today.key && day.cents >= today.cents) return false;
  }
  return true;
}

/** All-time revenue tiers (cents) worth a badge. */
export const REVENUE_MILESTONES = [
  100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000,
  50_000_000, 100_000_000,
];

/** Accounts-sold tiers worth a badge. */
export const ACCOUNT_MILESTONES = [10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000];

export type MilestoneProgress = {
  reached: number[];
  next: number | null;
  /** 0..1 progress from the last reached tier to the next one. */
  progress: number;
  remaining: number;
};

export function milestoneProgress(value: number, tiers: number[]): MilestoneProgress {
  const reached = tiers.filter((t) => value >= t);
  const next = tiers.find((t) => value < t) ?? null;
  if (next === null) return { reached, next, progress: 1, remaining: 0 };
  const floor = reached.length ? reached[reached.length - 1] : 0;
  const progress = Math.min(1, Math.max(0, (value - floor) / (next - floor)));
  return { reached, next, progress, remaining: next - value };
}

/** Short "3m ago" / "2h ago" / "yesterday" label. */
export function timeAgo(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}
