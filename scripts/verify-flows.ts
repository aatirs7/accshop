/**
 * End-to-end verification of the order lifecycle against the real dev DB:
 * order → mark paid (idempotent) → deliverables → credentials attach →
 * reveal-once atomicity → referral commission → Zelle expiry.
 * Run with the dev server STOPPED (PGlite is single-process):
 *   npx tsx --env-file=.env.local scripts/verify-flows.ts
 */
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  credentials,
  deliverables,
  orders,
  partners,
  payments,
  products,
  users,
  commissions,
} from "@/lib/db/schema";
import { generateOrderCode } from "@/lib/orders/code";
import { markOrderPaid } from "@/lib/payments/mark-paid";
import {
  credentialFingerprint,
  decryptCredential,
  encryptCredential,
} from "@/lib/crypto/credentials";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `, ${detail}` : ""}`);
  if (!cond) failures++;
}

async function main() {
  const product = (await db.query.products.findFirst({
    where: eq(products.slug, "tiktok-affiliate-100k"),
  }))!;
  const customer = (await db.query.users.findFirst({
    where: eq(users.email, "demo.customer@example.com"),
  }))!;
  const partner = (await db.query.partners.findFirst())!;
  const admin = (await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  }))!;

  // --- 1. Zelle order lifecycle -------------------------------------------
  const [order] = await db
    .insert(orders)
    .values({
      orderCode: generateOrderCode(),
      userId: customer.id,
      productId: product.id,
      quantity: 3,
      unitPriceCents: 55_000,
      totalCents: 165_000,
      paymentMethod: "zelle",
      source: "retail",
    })
    .returning();

  await markOrderPaid(order.id, {
    method: "zelle",
    zelleReference: "verify-ref-1",
    confirmedByUserId: admin.id,
  });
  const paidOrder = (await db.query.orders.findFirst({
    where: eq(orders.id, order.id),
  }))!;
  check("order marked paid", paidOrder.paymentStatus === "paid");
  check("paidAt set", paidOrder.paidAt != null);

  const dels = await db.query.deliverables.findMany({
    where: eq(deliverables.orderId, order.id),
  });
  check("one deliverable per account (qty 3)", dels.length === 3, `got ${dels.length}`);

  const pays = await db.query.payments.findMany({
    where: eq(payments.orderId, order.id),
  });
  check("payment row recorded with admin confirmer", pays.length === 1 && pays[0].confirmedBy === admin.id);

  // Idempotency: second mark-paid is a no-op
  const second = await markOrderPaid(order.id, { method: "zelle" });
  const delsAfter = await db.query.deliverables.findMany({
    where: eq(deliverables.orderId, order.id),
  });
  check("second markOrderPaid is a no-op", second.alreadyPaid === true && delsAfter.length === 3);

  // --- 2. Credentials: attach + reveal-once atomicity ----------------------
  const target = dels[0];
  const payload = {
    fields: [
      { label: "TikTok username", value: "verify_acct_1" },
      { label: "TikTok password", value: "Str0ng!Pass" },
    ],
    notes: "verification run",
  };
  const enc = encryptCredential(payload, target.id);
  const [cred] = await db
    .insert(credentials)
    .values({
      deliverableId: target.id,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      keyVersion: enc.keyVersion,
      fingerprint: credentialFingerprint(payload),
      createdBy: admin.id,
    })
    .returning();
  check("credential stored encrypted (no plaintext column)", !JSON.stringify(cred).includes("Str0ng!Pass"));

  // The atomic reveal lock, same statement the reveal action uses
  const revealOnce = () =>
    db
      .update(credentials)
      .set({
        revealLocked: true,
        firstRevealedAt: sql`coalesce(${credentials.firstRevealedAt}, now())`,
        revealCount: sql`${credentials.revealCount} + 1`,
      })
      .where(and(eq(credentials.id, cred.id), eq(credentials.revealLocked, false)))
      .returning({ id: credentials.id });

  const [first, replay] = [await revealOnce(), await revealOnce()];
  check("first reveal acquires the lock", first.length === 1);
  check("second reveal is blocked", replay.length === 0);

  const dec = decryptCredential(
    { ciphertext: cred.ciphertext, iv: cred.iv, authTag: cred.authTag, keyVersion: cred.keyVersion },
    target.id,
  );
  check("decrypted payload matches", dec.fields[1].value === "Str0ng!Pass");

  // Admin unlock re-enables exactly one more reveal
  await db.update(credentials).set({ revealLocked: false }).where(eq(credentials.id, cred.id));
  const [again, blockedAgain] = [await revealOnce(), await revealOnce()];
  check("admin unlock allows one more reveal", again.length === 1 && blockedAgain.length === 0);

  // --- 3. Referral commission ----------------------------------------------
  const [refOrder] = await db
    .insert(orders)
    .values({
      orderCode: generateOrderCode(),
      userId: customer.id,
      partnerId: partner.id,
      productId: product.id,
      quantity: 1,
      unitPriceCents: 55_000,
      totalCents: 55_000,
      paymentMethod: "stripe",
      source: "referral",
    })
    .returning();
  await markOrderPaid(refOrder.id, { method: "stripe", stripePaymentIntentId: "pi_verify" });
  const comm = await db.query.commissions.findFirst({
    where: eq(commissions.orderId, refOrder.id),
  });
  check(
    "referral commission accrued at partner rate (10% of $550)",
    comm?.status === "accrued" && comm.amountCents === 5_500,
    comm ? `${comm.amountCents}c` : "none",
  );

  // Wholesale partner orders must NOT accrue commission
  const [wholesale] = await db
    .insert(orders)
    .values({
      orderCode: generateOrderCode(),
      userId: partner.userId,
      partnerId: partner.id,
      productId: product.id,
      quantity: 10,
      unitPriceCents: 40_000,
      totalCents: 400_000,
      paymentMethod: "zelle",
      source: "partner",
    })
    .returning();
  await markOrderPaid(wholesale.id, { method: "zelle", confirmedByUserId: admin.id });
  const wholesaleComm = await db.query.commissions.findFirst({
    where: eq(commissions.orderId, wholesale.id),
  });
  check("wholesale partner order accrues no commission", wholesaleComm == null);

  // --- 4. Zelle expiry sweep ----------------------------------------------
  const [stale] = await db
    .insert(orders)
    .values({
      orderCode: generateOrderCode(),
      userId: customer.id,
      productId: product.id,
      quantity: 1,
      unitPriceCents: 55_000,
      totalCents: 55_000,
      paymentMethod: "zelle",
      source: "retail",
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    })
    .returning();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const expired = await db
    .update(orders)
    .set({ paymentStatus: "cancelled" })
    .where(
      and(
        eq(orders.paymentMethod, "zelle"),
        eq(orders.paymentStatus, "pending"),
        lt(orders.createdAt, cutoff),
      ),
    )
    .returning({ id: orders.id });
  check(
    "expiry sweep cancels only stale pending Zelle orders",
    expired.some((o) => o.id === stale.id) && !expired.some((o) => o.id === order.id),
  );

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
