/**
 * Static, hand-issued promo codes (separate from the per-user email-capture
 * discounts in `emailCaptures`). Amount is capped in `startCheckout` so a
 * total never goes below $1. Shared between the server-side checkout action
 * and the client-side price preview so they never drift.
 */
export const PROMO_CODES: Record<string, number> = {
  THIRTY: 3000,
  GIFT: 15000,
  HUNDRED: 10000,
};
