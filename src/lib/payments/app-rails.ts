import { env } from "@/lib/env";

/**
 * Pay-by-app rails: the buyer pays from their own PayPal/Venmo/Cash App with
 * the order code as the note, and the admin confirms it by hand, exactly like
 * the Zelle rail. These are the live rails while card checkout is paused, so
 * a rail with no link configured is simply hidden from checkout.
 */
export type AppRail = "paypal" | "venmo" | "cashapp";

export interface AppRailInfo {
  id: AppRail;
  /** Buyer-facing name of the app. */
  label: string;
  /** Where we send the buyer to pay. Empty means the rail is off. */
  payUrl: string;
  /** What that app calls the free-text field the order code goes in. */
  noteLabel: string;
}

const RAILS: Record<AppRail, Omit<AppRailInfo, "payUrl">> = {
  paypal: { id: "paypal", label: "PayPal", noteLabel: "note" },
  venmo: { id: "venmo", label: "Venmo", noteLabel: "note" },
  cashapp: { id: "cashapp", label: "Cash App", noteLabel: "note" },
};

const PAY_URLS: Record<AppRail, () => string> = {
  paypal: () => env.PAYPAL_PAY_URL,
  venmo: () => env.VENMO_PAY_URL,
  cashapp: () => env.CASHAPP_PAY_URL,
};

export function isAppRail(method: string): method is AppRail {
  return method in RAILS;
}

export function appRail(id: AppRail): AppRailInfo {
  return { ...RAILS[id], payUrl: PAY_URLS[id]().trim() };
}

/** Rails with a payment link configured, in checkout display order. */
export function activeAppRails(): AppRailInfo[] {
  return (Object.keys(RAILS) as AppRail[])
    .map(appRail)
    .filter((r) => r.payUrl.length > 0);
}

/** Buyer-facing name for any rail, used on order pages and emails. */
export function paymentMethodLabel(method: string): string {
  if (isAppRail(method)) return RAILS[method].label;
  if (method === "zelle") return "Zelle";
  return "card";
}

/** "PayPal, Venmo, or Cash App" for storefront copy. */
export function activeRailsSentence(): string {
  const labels = activeAppRails().map((r) => r.label);
  if (labels.length === 0) return "bank transfer";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
}
