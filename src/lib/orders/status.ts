export const WARRANTY_DAYS = 14;
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
    return { key: "warranty_active", label: "Delivered, warranty active" };
  return { key: "warranty_expired", label: "Delivered, warranty expired" };
}

/** Business timezone: "today" and typed dates are read on the owner's clock. */
const SHOP_TZ = "America/New_York";

/** Today's date as YYYY-MM-DD in the shop's timezone. */
export function shopToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(now);
}

/** A Date as YYYY-MM-DD in the shop's timezone, for date inputs. */
export function shopDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(date);
}

/**
 * Turn a typed fulfilled date (YYYY-MM-DD) into the moment the warranty
 * starts. Today means right now; a past day means noon that day, so the
 * date shown back is the date that was typed.
 */
export function fulfilledDateToInstant(
  day: string,
  now: Date = new Date(),
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const today = shopToday(now);
  if (day > today) return null;
  if (day === today) return now;
  const instant = new Date(`${day}T16:00:00Z`); // midday Eastern
  return Number.isNaN(instant.getTime()) ? null : instant;
}
