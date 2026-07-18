"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { deliverables, warrantyClaims } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { warrantyState } from "@/lib/orders/status";
import { adminEmails, env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { AdminNotifyEmail } from "@/lib/email/templates";
import { audit } from "@/lib/audit";

const claimSchema = z.object({
  deliverableId: z.string().min(1),
  reason: z.string().trim().min(10).max(2000),
});

export type ClaimResult = { ok: true } | { ok: false; error: string };

export async function submitWarrantyClaim(
  _prev: ClaimResult | null,
  formData: FormData,
): Promise<ClaimResult> {
  const user = await requireUser();
  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please describe the problem in at least 10 characters.",
    };
  }

  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, parsed.data.deliverableId),
    with: { order: true },
  });
  if (!deliverable || deliverable.order.userId !== user.id) {
    return { ok: false, error: "Account not found on your orders." };
  }

  const warranty = warrantyState(deliverable.deliveredAt);
  if (warranty.status !== "active") {
    return {
      ok: false,
      error:
        warranty.status === "expired"
          ? "The 30-day warranty on this account has expired."
          : "Warranty starts once the account is delivered.",
    };
  }

  const existing = await db.query.warrantyClaims.findFirst({
    where: and(
      eq(warrantyClaims.deliverableId, deliverable.id),
      eq(warrantyClaims.status, "open"),
    ),
  });
  if (existing) {
    return { ok: false, error: "There's already an open claim for this account." };
  }

  const [claim] = await db
    .insert(warrantyClaims)
    .values({
      deliverableId: deliverable.id,
      orderId: deliverable.orderId,
      userId: user.id,
      reason: parsed.data.reason,
    })
    .returning();

  await audit({
    actorUserId: user.id,
    action: "claim.submitted",
    entityType: "warranty_claim",
    entityId: claim.id,
    metadata: { orderCode: deliverable.order.orderCode },
  });

  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject: `Warranty claim, ${deliverable.order.orderCode}`,
        react: AdminNotifyEmail({
          heading: "New warranty claim",
          lines: [
            `Order ${deliverable.order.orderCode}`,
            `Customer: ${user.email}`,
            parsed.data.reason,
          ],
          url: `${env.APP_URL}/admin/claims`,
        }),
        text: `New warranty claim on ${deliverable.order.orderCode}: ${parsed.data.reason}`,
      }),
    ),
  );

  return { ok: true };
}
