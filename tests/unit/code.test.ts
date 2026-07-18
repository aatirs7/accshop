import { describe, expect, it } from "vitest";
import { generateOrderCode, ORDER_CODE_PATTERN } from "@/lib/orders/code";

describe("order codes", () => {
  it("matches the ACC-XXXXXX unambiguous pattern", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(ORDER_CODE_PATTERN);
      // No ambiguous chars that break Zelle-memo matching
      expect(code.slice(4)).not.toMatch(/[ILOU]/);
    }
  });

  it("does not collide across a reasonable sample", () => {
    const seen = new Set(Array.from({ length: 5000 }, generateOrderCode));
    expect(seen.size).toBe(5000);
  });
});
