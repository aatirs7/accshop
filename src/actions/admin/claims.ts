"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables, warrantyClaims } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { WarrantyClaimUpdateEmail } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const STATUS_LABELS: Record<string, string> = {
  in_review: "In review",
  replaced: "Approved, replacement on the way",
  refunded: "Approved, refunded",
  denied: "Denied",
};

/**
 * Resolve a warranty claim. "replaced" creates a fresh deliverable linked to
 * the failed one; it re-enters the sourcing pipeline and the admin attaches
 * new credentials as usual.
 */
export async function resolveClaim(
  claimId: string,
  resolution: "in_review" | "replaced" | "refunded" | "denied",
  notes: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const claim = await db.query.warrantyClaims.findFirst({
    where: eq(warrantyClaims.id, claimId),
    with: { order: true, user: true },
  });
  if (!claim) return { ok: false, error: "Claim not found." };
  if (claim.status === "replaced" || claim.status === "refunded" || claim.status === "denied") {
    return { ok: false, error: "Claim is already resolved." };
  }

  let replacementDeliverableId: string | null = null;
  if (resolution === "replaced") {
    const [replacement] = await db
      .insert(deliverables)
      .values({
        orderId: claim.orderId,
        status: "pending",
        replacesDeliverableId: claim.deliverableId,
      })
      .returning();
    replacementDeliverableId = replacement.id;
    await db
      .update(deliverables)
      .set({ status: "replaced" })
      .where(eq(deliverables.id, claim.deliverableId));
  }

  await db
    .update(warrantyClaims)
    .set({
      status: resolution,
      resolutionNotes: notes || null,
      replacementDeliverableId,
      resolvedAt: resolution === "in_review" ? null : new Date(),
    })
    .where(eq(warrantyClaims.id, claimId));

  await audit({
    actorUserId: admin.id,
    action: `claim.${resolution}`,
    entityType: "warranty_claim",
    entityId: claimId,
    metadata: { orderCode: claim.order.orderCode, replacementDeliverableId },
  });

  await sendEmail({
    to: claim.user.email,
    subject: `Warranty claim update, ${claim.order.orderCode}`,
    react: WarrantyClaimUpdateEmail({
      orderCode: claim.order.orderCode,
      statusLabel: STATUS_LABELS[resolution] ?? resolution,
      notes: notes || undefined,
      dashboardUrl: `${env.APP_URL}/dashboard/orders/${claim.order.orderCode}`,
    }),
    text: `Your warranty claim on ${claim.order.orderCode} is now: ${STATUS_LABELS[resolution] ?? resolution}. ${notes}`,
  });

  revalidatePath("/admin/claims");
  return { ok: true };
}
