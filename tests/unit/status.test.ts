import { describe, expect, it } from "vitest";
import {
  canAdvanceFulfillment,
  nextFulfillmentStatus,
  pipelineStage,
  warrantyState,
  WARRANTY_DAYS,
} from "@/lib/orders/status";

describe("fulfillment state machine", () => {
  it("allows only single forward steps", () => {
    expect(canAdvanceFulfillment("sourcing", "credentials_ready")).toBe(true);
    expect(canAdvanceFulfillment("credentials_ready", "delivered")).toBe(true);
  });

  it("rejects skips and reversals", () => {
    expect(canAdvanceFulfillment("sourcing", "delivered")).toBe(false);
    expect(canAdvanceFulfillment("delivered", "sourcing")).toBe(false);
    expect(canAdvanceFulfillment("credentials_ready", "sourcing")).toBe(false);
    expect(canAdvanceFulfillment("sourcing", "sourcing")).toBe(false);
  });

  it("computes the next status", () => {
    expect(nextFulfillmentStatus("sourcing")).toBe("credentials_ready");
    expect(nextFulfillmentStatus("delivered")).toBeNull();
  });
});

describe("warranty derivation", () => {
  const day = 24 * 60 * 60 * 1000;

  it("is not started before delivery", () => {
    expect(warrantyState(null).status).toBe("not_started");
  });

  it("is active strictly inside the window", () => {
    const delivered = new Date("2026-01-01T00:00:00Z");
    const state = warrantyState(delivered, new Date(delivered.getTime() + 10 * day));
    expect(state.status).toBe("active");
    if (state.status === "active") expect(state.daysLeft).toBe(20);
  });

  it("expires exactly at day 30 (boundary)", () => {
    const delivered = new Date("2026-01-01T00:00:00Z");
    const boundary = new Date(delivered.getTime() + WARRANTY_DAYS * day);
    expect(warrantyState(delivered, boundary).status).toBe("expired");
    expect(
      warrantyState(delivered, new Date(boundary.getTime() - 1)).status,
    ).toBe("active");
  });
});

describe("pipeline stage labels", () => {
  it("prioritizes payment state", () => {
    expect(
      pipelineStage({
        paymentStatus: "pending",
        fulfillmentStatus: "sourcing",
        deliveredAt: null,
      }).key,
    ).toBe("awaiting_payment");
  });

  it("splits delivered into warranty active/expired", () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const old = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    expect(
      pipelineStage({
        paymentStatus: "paid",
        fulfillmentStatus: "delivered",
        deliveredAt: recent,
      }).key,
    ).toBe("warranty_active");
    expect(
      pipelineStage({
        paymentStatus: "paid",
        fulfillmentStatus: "delivered",
        deliveredAt: old,
      }).key,
    ).toBe("warranty_expired");
  });
});
