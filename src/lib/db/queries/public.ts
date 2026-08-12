import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Public-facing social proof. `accountsSold` is the REAL count of accounts in
 * paid orders plus an optional configured baseline (SOCIAL_PROOF_ACCOUNTS_BASE)
 * so a fresh store shows a credible number without fabricating orders.
 */
export async function socialProof() {
  const [row] = await db
    .select({
      accountsSold: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(orders)
    .where(eq(orders.paymentStatus, "paid"));

  return {
    accountsSold: Number(row.accountsSold) + env.SOCIAL_PROOF_ACCOUNTS_BASE,
    rating: env.SOCIAL_PROOF_RATING,
  };
}
