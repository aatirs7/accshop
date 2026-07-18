"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { credentials, deliverables } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  credentialFingerprint,
  encryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

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
 * round-trips back to the admin UI — only a fingerprint is shown after save.
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
