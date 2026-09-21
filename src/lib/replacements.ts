/**
 * What one banned-account replacement costs the owner, in cents ($180). Kept in
 * one place so the form preview, the stored snapshot, and the profit maths never
 * drift.
 */
export const REPLACEMENT_COST_CENTS = 18000;

/** Total replacement cost in cents for a whole number of accounts. */
export function replacementCostCents(accounts: number): number {
  return Math.max(0, Math.round(accounts)) * REPLACEMENT_COST_CENTS;
}
