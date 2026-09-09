import { describe, expect, it } from "vitest";
import { parseMetricsRange, rangeLabel } from "@/lib/admin/metrics-range";

describe("admin overview metrics range", () => {
  it("defaults to a rolling 30 days when nothing is picked", () => {
    const r = parseMetricsRange({});
    expect(r.preset).toBe("30d");
    expect(r.from).toBeInstanceOf(Date);
    expect(r.to).toBeUndefined();
    expect(rangeLabel(r)).toBe("last 30 days");
  });

  it("uses the browser-supplied window for presets", () => {
    const from = Date.UTC(2026, 8, 9);
    const to = Date.UTC(2026, 8, 10);
    const r = parseMetricsRange({ range: "today", from: String(from), to: String(to) });
    expect(r.preset).toBe("today");
    expect(r.from?.getTime()).toBe(from);
    expect(r.to?.getTime()).toBe(to);
  });

  it("has no bounds for all time", () => {
    const r = parseMetricsRange({ range: "all" });
    expect(r.from).toBeUndefined();
    expect(r.to).toBeUndefined();
  });

  it("keeps the picked days for a custom range", () => {
    const r = parseMetricsRange({
      range: "custom",
      from: "1000",
      to: "2000",
      fromDay: "2026-09-01",
      toDay: "2026-09-08",
    });
    expect(r.preset).toBe("custom");
    expect(r.fromDay).toBe("2026-09-01");
    expect(r.toDay).toBe("2026-09-08");
  });

  it("falls back safely on bad input", () => {
    expect(parseMetricsRange({ range: "custom" }).preset).toBe("30d");
    expect(parseMetricsRange({ range: "nope", from: "abc" }).preset).toBe("30d");
    expect(parseMetricsRange({ range: "custom", from: "1", fromDay: "x" }).fromDay).toBeUndefined();
  });
});
