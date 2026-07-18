export const WARRANTY_DAYS = 30;
/** Reveals stay available this long past warranty expiry, then can be revoked. */
export const REVEAL_GRACE_DAYS = 7;

export type FulfillmentStatus = "sourcing" | "credentials_ready" | "delivered";

const FULFILLMENT_ORDER: FulfillmentStatus[] = [
  "sourcing",
  "credentials_ready",
  "delivered",
];

/** Fulfillment may only advance one step at a time, never backwards. */
export function canAdvanceFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): boolean {
  return FULFILLMENT_ORDER.indexOf(to) === FULFILLMENT_ORDER.indexOf(from) + 1;
}

export function nextFulfillmentStatus(
  from: FulfillmentStatus,
): FulfillmentStatus | null {
  return FULFILLMENT_ORDER[FULFILLMENT_ORDER.indexOf(from) + 1] ?? null;
}

export type WarrantyState =
  | { status: "not_started" }
  | { status: "active"; expiresAt: Date; daysLeft: number }
  | { status: "expired"; expiredAt: Date };

export function warrantyState(
  deliveredAt: Date | null,
  now: Date = new Date(),
): WarrantyState {
  if (!deliveredAt) return { status: "not_started" };
  const expiresAt = new Date(
    deliveredAt.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000,
  );
  if (now < expiresAt) {
    return {
      status: "active",
      expiresAt,
      daysLeft: Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000),
    };
  }
  return { status: "expired", expiredAt: expiresAt };
}

/** Customer-facing pipeline label combining payment + fulfillment + warranty. */
export function pipelineStage(order: {
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
  deliveredAt: Date | null;
}): {
  key: string;
  label: string;
} {
  if (order.paymentStatus === "cancelled")
    return { key: "cancelled", label: "Cancelled" };
  if (order.paymentStatus === "refunded")
    return { key: "refunded", label: "Refunded" };
  if (order.paymentStatus === "pending")
    return { key: "awaiting_payment", label: "Awaiting payment" };
  if (order.fulfillmentStatus === "sourcing")
    return { key: "sourcing", label: "Sourcing your account" };
  if (order.fulfillmentStatus === "credentials_ready")
    return { key: "credentials_ready", label: "Credentials ready" };
  const warranty = warrantyState(order.deliveredAt);
  if (warranty.status === "active")
    return { key: "warranty_active", label: "Delivered — warranty active" };
  return { key: "warranty_expired", label: "Delivered — warranty expired" };
}
