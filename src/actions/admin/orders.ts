"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { credentials, deliverables, orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  canAdvanceFulfillment,
  type FulfillmentStatus,
} from "@/lib/orders/status";
import { markOrderPaid } from "@/lib/payments/mark-paid";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/resend";
import {
  CredentialsReadyEmail,
  ZelleInstructionsEmail,
} from "@/lib/email/templates";
import { audit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mark a paid order delivered for the manual-fulfillment flow: the owner has
 * emailed the account themselves, so this just flips fulfillment to delivered
 * (starting the warranty) without requiring credentials attached on-site.
 */
export async function markOrderDelivered(
  orderId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus !== "paid") {
    return { ok: false, error: "Order isn't paid yet." };
  }
  const now = new Date();
  await db
    .update(deliverables)
    .set({ status: "delivered", deliveredAt: now })
    .where(
      and(
        eq(deliverables.orderId, orderId),
        eq(deliverables.status, "pending"),
      ),
    );
  await db
    .update(orders)
    .set({
      fulfillmentStatus: "delivered",
      deliveredAt: order.deliveredAt ?? now,
    })
    .where(eq(orders.id, orderId));
  await audit({
    actorUserId: admin.id,
    action: "order.marked_delivered_manual",
    entityType: "order",
    entityId: orderId,
    metadata: { orderCode: order.orderCode },
  });
  revalidatePath(`/admin/orders/${order.orderCode}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

/**
 * Manually mark an order paid — the safety valve if the Stripe webhook is
 * delayed or not yet configured. Converges on the same markOrderPaid path.
 */
export async function markZellePaid(
  orderId: string,
  reference: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return { ok: false, error: "Order not found." };
  try {
    await markOrderPaid(orderId, {
      method: order.paymentMethod,
      zelleReference:
        order.paymentMethod === "zelle"
          ? reference.trim() || "unreferenced"
          : undefined,
      confirmedByUserId: admin.id,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.orderCode}`);
  return { ok: true };
}

export async function advanceOrderStage(
  orderId: string,
  to: FulfillmentStatus,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true, deliverables: { with: { credential: true } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus !== "paid") {
    return { ok: false, error: "Order isn't paid." };
  }
  if (!canAdvanceFulfillment(order.fulfillmentStatus, to)) {
    return {
      ok: false,
      error: `Can't go from ${order.fulfillmentStatus} to ${to}.`,
    };
  }
  if (to === "credentials_ready") {
    const missing = order.deliverables.filter((d) => !d.credential);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `${missing.length} account(s) still need credentials attached.`,
      };
    }
  }

  const now = new Date();
  await db
    .update(orders)
    .set({
      fulfillmentStatus: to,
      deliveredAt: to === "delivered" ? (order.deliveredAt ?? now) : order.deliveredAt,
    })
    .where(eq(orders.id, orderId));

  if (to === "credentials_ready") {
    await db
      .update(deliverables)
      .set({ status: "ready" })
      .where(
        and(eq(deliverables.orderId, orderId), eq(deliverables.status, "pending")),
      );
    await sendEmail({
      to: order.user.email,
      subject: `Your account is ready, ${order.orderCode}`,
      react: CredentialsReadyEmail({
        orderCode: order.orderCode,
        dashboardUrl: `${env.APP_URL}/dashboard/orders/${order.orderCode}`,
      }),
      text: `Your credentials for order ${order.orderCode} are ready in your secure dashboard: ${env.APP_URL}/dashboard/orders/${order.orderCode} (never sent by email).`,
    });
  }
  if (to === "delivered") {
    await db
      .update(deliverables)
      .set({ status: "delivered", deliveredAt: now })
      .where(
        and(eq(deliverables.orderId, orderId), eq(deliverables.status, "ready")),
      );
  }

  await audit({
    actorUserId: admin.id,
    action: "order.stage_advance",
    entityType: "order",
    entityId: orderId,
    metadata: { from: order.fulfillmentStatus, to },
  });
  revalidatePath(`/admin/orders/${order.orderCode}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

const assignSchema = z.object({
  deliverableId: z.string().min(1),
  supplierId: z.string().min(1),
  costCents: z.coerce.number().int().min(0).max(10_000_000),
});

/** Record which supplier fulfilled a deliverable and the real cost paid. */
export async function assignDeliverableSupplier(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid supplier/cost." };
  const [updated] = await db
    .update(deliverables)
    .set({
      supplierId: parsed.data.supplierId,
      costCents: parsed.data.costCents,
    })
    .where(eq(deliverables.id, parsed.data.deliverableId))
    .returning();
  if (!updated) return { ok: false, error: "Deliverable not found." };
  await audit({
    actorUserId: admin.id,
    action: "deliverable.assign_supplier",
    entityType: "deliverable",
    entityId: parsed.data.deliverableId,
    metadata: { supplierId: parsed.data.supplierId, costCents: parsed.data.costCents },
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Support case: re-enable a one-time reveal after verifying the customer. */
export async function unlockReveal(credentialId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [updated] = await db
    .update(credentials)
    .set({ revealLocked: false })
    .where(eq(credentials.id, credentialId))
    .returning();
  if (!updated) return { ok: false, error: "Credential not found." };
  await audit({
    actorUserId: admin.id,
    action: "credential.reveal_unlocked",
    entityType: "credential",
    entityId: credentialId,
    metadata: { deliverableId: updated.deliverableId },
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function saveAdminNotes(
  orderId: string,
  notes: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db
    .update(orders)
    .set({ adminNotes: notes.slice(0, 5000) })
    .where(eq(orders.id, orderId));
  await audit({
    actorUserId: admin.id,
    action: "order.notes_updated",
    entityType: "order",
    entityId: orderId,
  });
  return { ok: true };
}

/** Re-send Zelle instructions for a pending order. */
export async function resendZelleInstructions(
  orderId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true },
  });
  if (!order || order.paymentMethod !== "zelle" || order.paymentStatus !== "pending") {
    return { ok: false, error: "Not a pending Zelle order." };
  }
  await sendEmail({
    to: order.user.email,
    subject: `Complete your order ${order.orderCode} via Zelle`,
    react: ZelleInstructionsEmail({
      orderCode: order.orderCode,
      totalFormatted: formatMoney(order.totalCents),
      recipientName: env.ZELLE_RECIPIENT_NAME,
      recipientHandle: env.ZELLE_RECIPIENT_HANDLE,
      instructionsUrl: `${env.APP_URL}/checkout/zelle/${order.orderCode}`,
    }),
    text: `Send ${formatMoney(order.totalCents)} via Zelle to ${env.ZELLE_RECIPIENT_NAME} (${env.ZELLE_RECIPIENT_HANDLE}), memo ${order.orderCode}.`,
  });
  return { ok: true };
}
