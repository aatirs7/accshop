// Affiliate program rules, in one place so the dashboard, admin and checkout
// never disagree.

/** Flat commission per eligible account sold (spec: $100 per account). */
export const AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS = 10_000;

export const DEFAULT_WEEKLY_LIVE_HOURS_GOAL = 10;
export const DEFAULT_WEEKLY_LIVE_SESSIONS_GOAL = 5;

/** Where the owner can send payouts. `value` is what is stored. */
export const PAYOUT_METHODS = [
  { value: "paypal", label: "PayPal", placeholder: "PayPal email or @username" },
  { value: "venmo", label: "Venmo", placeholder: "@username" },
  { value: "cashapp", label: "Cash App", placeholder: "$cashtag" },
  { value: "zelle", label: "Zelle", placeholder: "Email or phone on Zelle" },
  { value: "crypto", label: "Crypto (USDT)", placeholder: "Wallet address and network" },
] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number]["value"];

export function payoutMethodLabel(value: string | null | undefined): string {
  return PAYOUT_METHODS.find((m) => m.value === value)?.label ?? "Not set";
}

export type AffiliateCommissionStatus = "pending" | "approved" | "paid" | "reversed";

/** Legacy "accrued" rows are pending in every view. */
export function normalizeCommissionStatus(status: string): AffiliateCommissionStatus {
  if (status === "accrued") return "pending";
  return status as AffiliateCommissionStatus;
}

/** The public signup link the owner sends to new affiliates. */
export const AFFILIATE_JOIN_PATH = "/affiliates/join";
export const AFFILIATE_LOGIN_PATH = "/affiliates/login";
export const AFFILIATE_DASHBOARD_PATH = "/affiliates/dashboard";
