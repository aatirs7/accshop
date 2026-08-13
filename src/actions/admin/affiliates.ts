"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateCommissions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

/** Settle all accrued commissions for an affiliate after paying them out. */
export async function markAffiliateCommissionsPaid(
  affiliateId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const accrued = await db.query.affiliateCommissions.findMany({
    where: and(
      eq(affiliateCommissions.affiliateId, affiliateId),
      eq(affiliateCommissions.status, "accrued"),
    ),
  });
  if (accrued.length === 0) return { ok: false, error: "Nothing accrued." };
  await db
    .update(affiliateCommissions)
    .set({ status: "paid", paidAt: new Date() })
    .where(
      inArray(
        affiliateCommissions.id,
        accrued.map((c) => c.id),
      ),
    );
  await audit({
    actorUserId: admin.id,
    action: "affiliate.commissions_paid",
    entityType: "affiliate",
    entityId: affiliateId,
    metadata: {
      count: accrued.length,
      totalCents: accrued.reduce((s, c) => s + c.amountCents, 0),
    },
  });
  revalidatePath("/admin/affiliates");
  return { ok: true };
}
