import { describe, expect, it } from "vitest";
import { cleanAffCode } from "../../src/lib/affiliate-ref";

describe("cleanAffCode", () => {
  it("uppercases and trims a valid code", () => {
    expect(cleanAffCode("  shop ")).toBe("SHOP");
    expect(cleanAffCode("ali_99")).toBe("ALI_99");
  });
  it("rejects empty, too short, too long and odd characters", () => {
    expect(cleanAffCode(undefined)).toBeNull();
    expect(cleanAffCode("")).toBeNull();
    expect(cleanAffCode("a")).toBeNull();
    expect(cleanAffCode("x".repeat(33))).toBeNull();
    expect(cleanAffCode("bad code")).toBeNull();
    expect(cleanAffCode("<script>")).toBeNull();
  });
});
