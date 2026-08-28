// Static, hand-issued promo codes (separate from the per-user email-capture
// discounts in `emailCaptures`). Amount is capped so a total never goes
// below $1. Shared between the checkout action (server) and the checkout
// form (client preview) so the two never drift apart.
export const PROMO_CODES: Record<string, number> = {
  THIRTY: 3000,
  GIFT: 15000,
};
