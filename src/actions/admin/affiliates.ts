"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateReferralCode } from "@/lib/session";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const affiliateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().max(40).optional(),
  commissionPercent: z.coerce.number().min(0).max(50).default(10),
});

/**
 * Admin-created referral code: finds or creates the user by email and
 * issues them an affiliate code with a chosen commission rate, e.g. for a
 * named referrer who doesn't need to sign up themselves.
 */
export async function createAffiliate(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = affiliateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Enter a name, email, and commission %." };
  }
  const { name, email, commissionPercent } = parsed.data;
  const code = (parsed.data.code || generateReferralCode()).toUpperCase();

  const existingCode = await db.query.affiliates.findFirst({
    where: eq(affiliates.code, code),
  });
  if (existingCode) return { ok: false, error: "That code is already in use." };

  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    [user] = await db.insert(users).values({ email, name }).returning();
  }
  const existingAffiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, user.id),
  });
  if (existingAffiliate) {
    return { ok: false, error: "This person already has a referral code." };
  }

  await db.insert(affiliates).values({
    userId: user.id,
    code,
    commissionRateBps: Math.round(commissionPercent * 100),
  });
  await audit({
    actorUserId: admin.id,
    action: "affiliate.created_by_admin",
    entityType: "affiliate",
    entityId: user.id,
    metadata: { code, commissionPercent },
  });
  revalidatePath("/admin/affiliates");
  return { ok: true };
}

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
