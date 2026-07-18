"use server";

import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  credentials,
  deliverables,
  orders,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import {
  decryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { REVEAL_GRACE_DAYS, WARRANTY_DAYS } from "@/lib/orders/status";
import { audit } from "@/lib/audit";

const REVEALS_PER_HOUR = 10;

export type RevealResult =
  | { ok: true; payload: CredentialPayload }
  | { ok: false; error: string };

/**
 * One-time credential reveal. The UPDATE ... WHERE reveal_locked = false is
 * the lock: a double-click or replayed request finds the row already locked
 * and is denied. Re-reveal requires an admin unlock (audited).
 */
export async function revealCredential(
  deliverableId: string,
): Promise<RevealResult> {
  const user = await requireUser();

  const deny = async (reason: string, message: string): Promise<RevealResult> => {
    await audit({
      actorUserId: user.id,
      action: "credential.reveal_denied",
      entityType: "deliverable",
      entityId: deliverableId,
      metadata: { reason },
    });
    return { ok: false, error: message };
  };

  // Rate limit: session theft shouldn't allow trawling.
  const [{ value: recentReveals }] = await db
    .select({ value: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actorUserId, user.id),
        eq(auditLogs.action, "credential.reveal"),
        gt(auditLogs.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    );
  if (recentReveals >= REVEALS_PER_HOUR) {
    return deny("rate_limited", "Too many reveals in the last hour. Try again later.");
  }

  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    with: { order: true, credential: true },
  });
  if (!deliverable || deliverable.order.userId !== user.id) {
    return deny("not_found_or_not_owner", "Credentials not found.");
  }
  if (deliverable.order.paymentStatus !== "paid") {
    return deny("order_not_paid", "This order isn't paid yet.");
  }
  const cred = deliverable.credential;
  if (!cred || deliverable.status === "pending") {
    return deny("not_ready", "Credentials aren't ready yet, we'll email you when they are.");
  }
  if (cred.revoked) {
    return deny("revoked", "These credentials are no longer available. Contact support if you need them.");
  }
  if (cred.revealLocked) {
    return deny(
      "already_revealed",
      "These credentials were already viewed. For security, re-access requires a support request.",
    );
  }
  // Reveal window: until warranty end + grace (from delivery; unlimited while
  // merely "ready" since delivery hasn't happened yet).
  if (deliverable.deliveredAt) {
    const cutoff = new Date(
      deliverable.deliveredAt.getTime() +
        (WARRANTY_DAYS + REVEAL_GRACE_DAYS) * 86_400_000,
    );
    if (new Date() > cutoff) {
      return deny("window_closed", "The reveal window for this order has closed. Contact support.");
    }
  }

  // Atomic lock, the row update IS the mutex.
  const locked = await db
    .update(credentials)
    .set({
      revealLocked: true,
      firstRevealedAt: sql`coalesce(${credentials.firstRevealedAt}, now())`,
      revealCount: sql`${credentials.revealCount} + 1`,
    })
    .where(and(eq(credentials.id, cred.id), eq(credentials.revealLocked, false)))
    .returning({ id: credentials.id });
  if (locked.length === 0) {
    return deny("race_lost", "These credentials were already viewed.");
  }

  let payload: CredentialPayload;
  try {
    payload = decryptCredential(
      {
        ciphertext: cred.ciphertext,
        iv: cred.iv,
        authTag: cred.authTag,
        keyVersion: cred.keyVersion,
      },
      deliverable.id,
    );
  } catch (err) {
    console.error("Credential decrypt failed", deliverable.id, err);
    return deny("decrypt_failed", "Something went wrong, contact support.");
  }

  // First reveal = the moment of delivery. Warranty starts now.
  const now = new Date();
  if (deliverable.status === "ready") {
    await db
      .update(deliverables)
      .set({ status: "delivered", deliveredAt: now })
      .where(eq(deliverables.id, deliverable.id));
    const remaining = await db.query.deliverables.findMany({
      where: eq(deliverables.orderId, deliverable.orderId),
    });
    const allDelivered = remaining.every(
      (d) => d.id === deliverable.id || d.status === "delivered" || d.status === "replaced",
    );
    if (allDelivered && deliverable.order.fulfillmentStatus !== "delivered") {
      await db
        .update(orders)
        .set({
          fulfillmentStatus: "delivered",
          deliveredAt: deliverable.order.deliveredAt ?? now,
        })
        .where(eq(orders.id, deliverable.orderId));
    }
  }

  await audit({
    actorUserId: user.id,
    action: "credential.reveal",
    entityType: "deliverable",
    entityId: deliverable.id,
    metadata: { orderCode: deliverable.order.orderCode },
  });

  return { ok: true, payload };
}
