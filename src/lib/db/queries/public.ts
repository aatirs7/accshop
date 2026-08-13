import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Public-facing social proof. When SOCIAL_PROOF_ACCOUNTS_BASE is set it is the
 * displayed "sold" figure (a curated baseline for a young store); otherwise we
 * show the real count of accounts in paid orders.
 */
export async function socialProof() {
  const [row] = await db
    .select({
      accountsSold: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(orders)
    .where(eq(orders.paymentStatus, "paid"));

  const real = Number(row.accountsSold);
  const accountsSold =
    env.SOCIAL_PROOF_ACCOUNTS_BASE > 0 ? env.SOCIAL_PROOF_ACCOUNTS_BASE : real;

  return { accountsSold };
}
