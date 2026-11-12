import { describe, expect, it } from "vitest";
import {
  fulfilledDateToInstant,
  shopToday,
  warrantyState,
} from "@/lib/orders/status";

// 2026-11-11 20:00 UTC is 3pm Eastern on Nov 11.
const now = new Date("2026-11-11T20:00:00Z");

describe("fulfilledDateToInstant", () => {
  it("reads today on the shop clock", () => {
    expect(shopToday(now)).toBe("2026-11-11");
    // 02:00 UTC Nov 12 is still Nov 11 in New York.
    expect(shopToday(new Date("2026-11-12T02:00:00Z"))).toBe("2026-11-11");
  });

  it("uses right now for today", () => {
    expect(fulfilledDateToInstant("2026-11-11", now)).toBe(now);
  });

  it("uses midday for a past day so the date reads back the same", () => {
    const d = fulfilledDateToInstant("2026-11-05", now)!;
    expect(d.toISOString()).toBe("2026-11-05T16:00:00.000Z");
    const w = warrantyState(d, now);
    expect(w.status).toBe("active");
    if (w.status === "active") expect(w.daysLeft).toBe(8);
  });

  it("rejects future and malformed dates", () => {
    expect(fulfilledDateToInstant("2026-11-12", now)).toBeNull();
    expect(fulfilledDateToInstant("11/05/2026", now)).toBeNull();
    expect(fulfilledDateToInstant("2026-13-45", now)).toBeNull();
  });
});
