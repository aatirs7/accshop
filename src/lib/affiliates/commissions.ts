import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateCommissions } from "@/lib/db/schema";
import { normalizeCommissionStatus, type AffiliateCommissionStatus } from "./constants";

/**
 * Allowed status moves for an affiliate commission. "paid" can still be
 * reversed (a refund after payout is recorded as a clawback); a reversed
 * commission can be reopened to pending if the reversal was a mistake.
 */
const ALLOWED: Record<AffiliateCommissionStatus, AffiliateCommissionStatus[]> = {
  pending: ["approved", "reversed"],
  approved: ["paid", "pending", "reversed"],
  paid: ["reversed"],
  reversed: ["pending"],
};

export type CommissionMoveResult = { ok: true } | { ok: false; error: string };

export async function setAffiliateCommissionStatus(
  commissionId: string,
  to: AffiliateCommissionStatus,
  reason?: string,
): Promise<CommissionMoveResult> {
  const row = await db.query.affiliateCommissions.findFirst({
    where: eq(affiliateCommissions.id, commissionId),
  });
  if (!row) return { ok: false, error: "That commission no longer exists." };
  const from = normalizeCommissionStatus(row.status);
  if (from === to) return { ok: true };
  if (!ALLOWED[from].includes(to)) {
    return { ok: false, error: `A ${from} commission can't be moved to ${to}.` };
  }
  const now = new Date();
  await db
    .update(affiliateCommissions)
    .set({
      status: to,
      approvedAt: to === "approved" ? now : to === "pending" ? null : row.approvedAt,
      paidAt: to === "paid" ? now : to === "pending" ? null : row.paidAt,
      reversedAt: to === "reversed" ? now : null,
      reversalReason: to === "reversed" ? (reason?.trim() || null) : null,
    })
    .where(eq(affiliateCommissions.id, commissionId));
  return { ok: true };
}

/**
 * Reverse the affiliate commission attached to an order (refund, chargeback,
 * cancelled after payment). Safe to call for orders with no affiliate or an
 * already reversed commission. Returns true when a commission was reversed.
 */
export async function reverseAffiliateCommissionForOrder(
  orderId: string,
  reason: string,
): Promise<boolean> {
  const rows = await db
    .update(affiliateCommissions)
    .set({ status: "reversed", reversedAt: new Date(), reversalReason: reason })
    .where(
      and(
        eq(affiliateCommissions.orderId, orderId),
        notInArray(affiliateCommissions.status, ["reversed"]),
      ),
    )
    .returning({ id: affiliateCommissions.id });
  return rows.length > 0;
}
