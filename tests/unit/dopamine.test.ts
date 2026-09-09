import { describe, expect, it } from "vitest";
import {
  ACCOUNT_MILESTONES,
  REVENUE_MILESTONES,
  bestDay,
  dayStart,
  isRecordDay,
  milestoneProgress,
  recentDays,
  saleStreak,
  timeAgo,
  todayTotal,
  type SalePoint,
} from "@/lib/admin/dopamine";

// A fixed "now" mid-afternoon, local time, so day math is unambiguous.
const NOW = new Date(2026, 8, 9, 15, 30).getTime();
const DAY = 86_400_000;

function sale(daysAgo: number, cents: number, q = 1, hour = 10): SalePoint {
  return { t: dayStart(NOW, -daysAgo) + hour * 3_600_000, c: cents, q };
}

describe("overview dopamine math", () => {
  it("sums today's sales by local day", () => {
    const today = todayTotal([sale(0, 55_000), sale(0, 60_000, 2), sale(1, 99_000)], NOW);
    expect(today.cents).toBe(115_000);
    expect(today.orders).toBe(2);
    expect(today.accounts).toBe(3);
  });

  it("zero-fills the recent days, oldest first", () => {
    const days = recentDays([sale(2, 10_000), sale(0, 5_000)], 3, NOW);
    expect(days.map((d) => d.cents)).toEqual([10_000, 0, 5_000]);
    expect(days[2].start).toBe(dayStart(NOW));
  });

  it("counts a streak ending today", () => {
    const points = [sale(0, 1), sale(1, 1), sale(2, 1), sale(4, 1)];
    expect(saleStreak(points, NOW)).toBe(3);
  });

  it("keeps the streak alive before today's first sale", () => {
    const points = [sale(1, 1), sale(2, 1)];
    expect(saleStreak(points, NOW)).toBe(2);
  });

  it("breaks the streak after a missed day", () => {
    expect(saleStreak([sale(2, 1), sale(3, 1)], NOW)).toBe(0);
    expect(saleStreak([], NOW)).toBe(0);
  });

  it("finds the best day and spots a record", () => {
    const points = [sale(3, 50_000), sale(3, 50_000), sale(1, 80_000), sale(0, 110_000)];
    expect(bestDay(points)?.cents).toBe(110_000);
    expect(isRecordDay(points, NOW)).toBe(true);
    expect(isRecordDay([...points, sale(5, 110_000)], NOW)).toBe(false);
    expect(isRecordDay([], NOW)).toBe(false);
    expect(bestDay([])).toBeNull();
  });

  it("tracks progress to the next milestone", () => {
    const p = milestoneProgress(750_000, REVENUE_MILESTONES);
    expect(p.reached).toEqual([100_000, 500_000]);
    expect(p.next).toBe(1_000_000);
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.remaining).toBe(250_000);

    const first = milestoneProgress(3, ACCOUNT_MILESTONES);
    expect(first.reached).toEqual([]);
    expect(first.next).toBe(10);
    expect(first.progress).toBeCloseTo(0.3);

    const done = milestoneProgress(10_000, ACCOUNT_MILESTONES);
    expect(done.next).toBeNull();
    expect(done.progress).toBe(1);
  });

  it("labels relative time", () => {
    expect(timeAgo(NOW - 10_000, NOW)).toBe("just now");
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe("5m ago");
    expect(timeAgo(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
    expect(timeAgo(NOW - DAY, NOW)).toBe("yesterday");
    expect(timeAgo(NOW - 4 * DAY, NOW)).toBe("4d ago");
  });
});
