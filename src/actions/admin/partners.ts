"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  bulkInquiries,
  commissions,
  partnerApplications,
  partnerPricingRules,
  partners,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { AdminNotifyEmail } from "@/lib/email/templates";
import { generateReferralCode } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

/**
 * Approving an application creates (or links) the user, promotes them to
 * partner, and creates the partner row. Pricing rules are set afterwards on
 * the partner detail page.
 */
export async function approveApplication(
  applicationId: string,
  commissionRateBps: number | null,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const app = await db.query.partnerApplications.findFirst({
    where: eq(partnerApplications.id, applicationId),
  });
  if (!app) return { ok: false, error: "Application not found." };
  if (app.status === "approved") return { ok: false, error: "Already approved." };

  const email = app.email.toLowerCase();
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name: app.name, role: "partner" })
      .returning();
  } else if (user.role === "customer") {
    await db.update(users).set({ role: "partner" }).where(eq(users.id, user.id));
  }

  const existingPartner = await db.query.partners.findFirst({
    where: eq(partners.userId, user.id),
  });
  if (!existingPartner) {
    await db.insert(partners).values({
      userId: user.id,
      businessName: app.tiktokHandle,
      commissionRateBps,
      referralCode: generateReferralCode(),
      approvedAt: new Date(),
      notes: `Approved from application. Est. weekly volume: ${app.estWeeklyVolume ?? "n/a"}`,
    });
  } else if (!existingPartner.referralCode) {
    await db
      .update(partners)
      .set({ referralCode: generateReferralCode() })
      .where(eq(partners.id, existingPartner.id));
  }

  await db
    .update(partnerApplications)
    .set({ status: "approved", reviewedBy: admin.id, decidedAt: new Date() })
    .where(eq(partnerApplications.id, applicationId));

  await audit({
    actorUserId: admin.id,
    action: "partner.approve",
    entityType: "partner_application",
    entityId: applicationId,
    metadata: { email },
  });

  await sendEmail({
    to: email,
    subject: "You're approved, ACCSHOP Partner Program",
    react: AdminNotifyEmail({
      heading: "Welcome to the ACCSHOP partner program",
      lines: [
        `Hi ${app.name}, your partner application is approved.`,
        "Sign in with this email address and your wholesale rates will apply automatically at checkout.",
        "Reply to this email to discuss volume tiers and referral commissions.",
      ],
      url: `${env.APP_URL}/login`,
    }),
    text: `Your ACCSHOP partner application is approved. Sign in with this email at ${env.APP_URL}/login, wholesale rates apply automatically at checkout.`,
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin/partners");
  return { ok: true };
}

/**
 * Set (or reset) a coach's login password so they can access their referral
 * dashboard. The owner shares the chosen password with the coach.
 */
export async function setPartnerPassword(
  partnerId: string,
  password: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (password.length < 6) {
    return { ok: false, error: "Use at least 6 characters." };
  }
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, partnerId),
  });
  if (!partner) return { ok: false, error: "Partner not found." };
  await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, partner.userId));
  await audit({
    actorUserId: admin.id,
    action: "partner.password_set",
    entityType: "partner",
    entityId: partnerId,
  });
  return { ok: true };
}

export async function rejectApplication(
  applicationId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db
    .update(partnerApplications)
    .set({ status: "rejected", reviewedBy: admin.id, decidedAt: new Date() })
    .where(eq(partnerApplications.id, applicationId));
  await audit({
    actorUserId: admin.id,
    action: "partner.reject_application",
    entityType: "partner_application",
    entityId: applicationId,
  });
  revalidatePath("/admin/applications");
  return { ok: true };
}

const ruleSchema = z.object({
  partnerId: z.string().min(1),
  productId: z.string().min(1),
  minQty: z.coerce.number().int().min(1).max(1000),
  unitPriceCents: z.coerce.number().int().min(100).max(10_000_000),
});

export async function addPricingRule(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid rule values." };
  await db
    .insert(partnerPricingRules)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: [
        partnerPricingRules.partnerId,
        partnerPricingRules.productId,
        partnerPricingRules.minQty,
      ],
      set: { unitPriceCents: parsed.data.unitPriceCents },
    });
  await audit({
    actorUserId: admin.id,
    action: "partner.pricing_rule_set",
    entityType: "partner",
    entityId: parsed.data.partnerId,
    metadata: parsed.data,
  });
  revalidatePath(`/admin/partners/${parsed.data.partnerId}`);
  return { ok: true };
}

export async function deletePricingRule(ruleId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [deleted] = await db
    .delete(partnerPricingRules)
    .where(eq(partnerPricingRules.id, ruleId))
    .returning();
  if (deleted) {
    await audit({
      actorUserId: admin.id,
      action: "partner.pricing_rule_deleted",
      entityType: "partner",
      entityId: deleted.partnerId,
    });
    revalidatePath(`/admin/partners/${deleted.partnerId}`);
  }
  return { ok: true };
}

export async function updatePartnerSettings(
  partnerId: string,
  settings: { commissionRateBps: number | null; status: "approved" | "suspended" },
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db
    .update(partners)
    .set(settings)
    .where(eq(partners.id, partnerId));
  await audit({
    actorUserId: admin.id,
    action: "partner.settings_updated",
    entityType: "partner",
    entityId: partnerId,
    metadata: settings,
  });
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}

/** Settle all accrued commissions for a partner (after paying them out). */
export async function markCommissionsPaid(
  partnerId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const accrued = await db.query.commissions.findMany({
    where: and(
      eq(commissions.partnerId, partnerId),
      eq(commissions.status, "accrued"),
    ),
  });
  if (accrued.length === 0) return { ok: false, error: "Nothing accrued." };
  await db
    .update(commissions)
    .set({ status: "paid", paidAt: new Date() })
    .where(
      inArray(
        commissions.id,
        accrued.map((c) => c.id),
      ),
    );
  await audit({
    actorUserId: admin.id,
    action: "partner.commissions_paid",
    entityType: "partner",
    entityId: partnerId,
    metadata: {
      count: accrued.length,
      totalCents: accrued.reduce((s, c) => s + c.amountCents, 0),
    },
  });
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: "new" | "contacted" | "converted" | "closed",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db
    .update(bulkInquiries)
    .set({ status })
    .where(eq(bulkInquiries.id, inquiryId));
  await audit({
    actorUserId: admin.id,
    action: "inquiry.status_updated",
    entityType: "bulk_inquiry",
    entityId: inquiryId,
    metadata: { status },
  });
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
