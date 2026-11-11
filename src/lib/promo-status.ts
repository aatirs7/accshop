import { db } from "@/lib/db";
import { promoCodeSettings } from "@/lib/db/schema";
import { PROMO_CODES } from "@/lib/promo-codes";

/** Codes switched off in admin. Anything without a row is on. */
export async function disabledPromoCodes(): Promise<Set<string>> {
  const rows = await db.select().from(promoCodeSettings);
  return new Set(rows.filter((r) => !r.active).map((r) => r.code));
}

/** The promo codes that work at checkout right now, with their amounts. */
export async function activePromoCodes(): Promise<Record<string, number>> {
  const off = await disabledPromoCodes();
  return Object.fromEntries(Object.entries(PROMO_CODES).filter(([code]) => !off.has(code)));
}
