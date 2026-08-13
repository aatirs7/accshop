"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { credentials, deliverables, orders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  credentialFingerprint,
  decryptCredential,
  encryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { AccountDeliveryEmail } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

/**
 * Emails the buyer their account login details for an order, then marks the
 * order delivered. This is how retail customers receive their accounts (they
 * don't sign in). Requires every account to have credentials attached.
 */
export async function emailAccountToCustomer(
  orderId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      user: true,
      deliverables: { with: { credential: true } },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus !== "paid") {
    return { ok: false, error: "Order isn't paid yet." };
  }
  const active = order.deliverables.filter((d) => d.status !== "replaced");
  if (active.length === 0 || active.some((d) => !d.credential)) {
    return {
      ok: false,
      error: "Attach credentials to every account before emailing.",
    };
  }

  const accounts = active.map((d) => {
    const payload = decryptCredential(
      {
        ciphertext: d.credential!.ciphertext,
        iv: d.credential!.iv,
        authTag: d.credential!.authTag,
        keyVersion: d.credential!.keyVersion,
      },
      d.id,
    );
    return { fields: payload.fields, notes: payload.notes };
  });

  await sendEmail({
    to: order.user.email,
    subject: `Your account is ready — ${order.orderCode}`,
    react: AccountDeliveryEmail({
      orderCode: order.orderCode,
      accounts,
      supportEmail: env.SUPPORT_EMAIL,
    }),
    text:
      `Your account for order ${order.orderCode} is ready:\n\n` +
      accounts
        .map(
          (a, i) =>
            `${accounts.length > 1 ? `Account ${i + 1}\n` : ""}` +
            a.fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
        )
        .join("\n\n") +
      `\n\nQuestions? ${env.SUPPORT_EMAIL}`,
  });

  const now = new Date();
  await db
    .update(deliverables)
    .set({ status: "delivered", deliveredAt: now })
    .where(eq(deliverables.orderId, orderId));
  await db
    .update(orders)
    .set({
      fulfillmentStatus: "delivered",
      deliveredAt: order.deliveredAt ?? now,
    })
    .where(eq(orders.id, orderId));

  await audit({
    actorUserId: admin.id,
    action: "order.account_emailed",
    entityType: "order",
    entityId: orderId,
    metadata: { orderCode: order.orderCode },
  });
  revalidatePath(`/admin/orders/${order.orderCode}`);
  return { ok: true };
}

const attachSchema = z.object({
  deliverableId: z.string().min(1),
  tiktokUsername: z.string().trim().min(1).max(200),
  tiktokPassword: z.string().min(1).max(500),
  linkedEmail: z.string().trim().max(300).optional(),
  linkedEmailPassword: z.string().max(500).optional(),
  twoFactorCodes: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Encrypts and stores credentials for one deliverable. Plaintext never
 * round-trips back to the admin UI, only a fingerprint is shown after save.
 */
export async function attachCredentials(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = attachSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Username and password are required." };
  }
  const d = parsed.data;

  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, d.deliverableId),
    with: { credential: true, order: true },
  });
  if (!deliverable) return { ok: false, error: "Deliverable not found." };
  if (deliverable.credential && !deliverable.credential.revoked) {
    return {
      ok: false,
      error: "Credentials already attached. Revoke first to replace them.",
    };
  }
  if (deliverable.credential?.revoked) {
    // Replacing revoked credentials: clear the old row first.
    await db
      .delete(credentials)
      .where(eq(credentials.id, deliverable.credential.id));
  }

  const payload: CredentialPayload = {
    fields: [
      { label: "TikTok username", value: d.tiktokUsername },
      { label: "TikTok password", value: d.tiktokPassword },
      ...(d.linkedEmail
        ? [{ label: "Linked email", value: d.linkedEmail }]
        : []),
      ...(d.linkedEmailPassword
        ? [{ label: "Email password", value: d.linkedEmailPassword }]
        : []),
      ...(d.twoFactorCodes
        ? [{ label: "2FA backup codes", value: d.twoFactorCodes }]
        : []),
    ],
    notes: d.notes || undefined,
  };

  const enc = encryptCredential(payload, deliverable.id);
  await db.insert(credentials).values({
    deliverableId: deliverable.id,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    fingerprint: credentialFingerprint(payload),
    createdBy: admin.id,
  });

  await audit({
    actorUserId: admin.id,
    action: "credential.attach",
    entityType: "deliverable",
    entityId: deliverable.id,
    metadata: { orderCode: deliverable.order.orderCode },
  });

  revalidatePath(`/admin/orders/${deliverable.order.orderCode}`);
  return { ok: true };
}

/** Revoke stored credentials (e.g. compromised or being replaced). */
export async function revokeCredentials(
  credentialId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [updated] = await db
    .update(credentials)
    .set({ revoked: true })
    .where(eq(credentials.id, credentialId))
    .returning();
  if (!updated) return { ok: false, error: "Credential not found." };
  await audit({
    actorUserId: admin.id,
    action: "credential.revoke",
    entityType: "credential",
    entityId: credentialId,
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}
