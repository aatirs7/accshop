"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  emailCaptures,
  orders,
  partners,
  productVariants,
  products,
  users,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { resolveUnitPrice } from "@/lib/pricing";
import { generateOrderCode } from "@/lib/orders/code";
import { getProvider, type PaymentMethod } from "@/lib/payments/provider";
import { stripeConfigured } from "@/lib/payments/stripe";
import { audit } from "@/lib/audit";

const checkoutSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  method: z.enum(["stripe", "zelle"]),
  ref: z.string().optional(),
  variantId: z.string().optional(),
  discountCode: z.string().trim().optional(),
});

export type CheckoutResult = { ok: false; error: string };

export async function startCheckout(
  _prev: CheckoutResult | null,
  formData: FormData,
): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please check your email and quantity." };
  }
  const { productSlug, quantity, method, ref, variantId, discountCode } =
    parsed.data;

  if (method === "stripe" && !stripeConfigured()) {
    return {
      ok: false,
      error: "Card payments are temporarily unavailable, please use Zelle.",
    };
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, productSlug), eq(products.active, true)),
  });
  if (!product) return { ok: false, error: "This product is no longer available." };

  // Signed-in users buy as themselves; guests get an account upserted by
  // email (they'll magic-link into it to receive credentials).
  const session = await auth();
  let userId: string;
  let email: string;
  if (session?.user) {
    userId = session.user.id;
    email = session.user.email!;
  } else {
    email = parsed.data.email;
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      userId = existing.id;
    } else {
      const [created] = await db
        .insert(users)
        .values({ email })
        .returning();
      userId = created.id;
    }
  }

  const price = await resolveUnitPrice(userId, product.id, quantity);

  // Referral attribution (?ref=partnerId): only when the buyer isn't the
  // partner themself and partner pricing didn't already claim the order.
  let source: "retail" | "partner" | "referral" = price.source;
  let partnerId = price.partnerId;
  if (ref && price.source === "retail") {
    const refPartner = await db.query.partners.findFirst({
      where: and(eq(partners.id, ref), eq(partners.status, "approved")),
    });
    if (refPartner && refPartner.userId !== userId) {
      source = "referral";
      partnerId = refPartner.id;
    }
  }

  // Variant price delta (e.g. "Enable TikTok Shop" +$50), on top of resolved price.
  let variant: { id: string; label: string; priceDeltaCents: number } | null =
    null;
  if (variantId) {
    const v = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, product.id),
      ),
    });
    if (v) variant = { id: v.id, label: v.label, priceDeltaCents: v.priceDeltaCents };
  }
  const unitPriceCents = price.unitPriceCents + (variant?.priceDeltaCents ?? 0);

  // One-time email-capture discount (flat, order-level).
  let appliedDiscountCode: string | null = null;
  let discountCents = 0;
  if (discountCode) {
    const capture = await db.query.emailCaptures.findFirst({
      where: eq(emailCaptures.discountCode, discountCode.toUpperCase()),
    });
    if (capture && !capture.redeemedAt) {
      appliedDiscountCode = capture.discountCode;
      discountCents = capture.discountAmountCents;
    }
  }

  const subtotal = unitPriceCents * quantity;
  // Never discount below $1 so the payment stays valid.
  const totalCents = Math.max(100, subtotal - discountCents);
  discountCents = subtotal - totalCents;

  let order;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      [order] = await db
        .insert(orders)
        .values({
          orderCode: generateOrderCode(),
          userId,
          partnerId,
          productId: product.id,
          quantity,
          unitPriceCents,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
          discountCode: appliedDiscountCode,
          discountCents,
          totalCents,
          paymentMethod: method as PaymentMethod,
          source,
        })
        .returning();
      break;
    } catch (err) {
      if (attempt === 2) throw err; // order-code collision is ~1e-9; retry twice
    }
  }
  if (!order) return { ok: false, error: "Could not create your order. Please try again." };

  await audit({
    actorUserId: userId,
    action: "order.created",
    entityType: "order",
    entityId: order.id,
    metadata: {
      orderCode: order.orderCode,
      method,
      quantity,
      totalCents,
      variant: variant?.label ?? null,
      discountCode: appliedDiscountCode,
    },
  });

  let redirectUrl: string;
  try {
    const initiated = await getProvider(method as PaymentMethod).initiate({
      id: order.id,
      orderCode: order.orderCode,
      quantity,
      unitPriceCents,
      totalCents,
      productName: variant ? `${product.name} (${variant.label})` : product.name,
      customerEmail: email,
    });
    redirectUrl = initiated.redirectUrl;
    if (initiated.checkoutSessionId) {
      await db
        .update(orders)
        .set({ stripeCheckoutSessionId: initiated.checkoutSessionId })
        .where(eq(orders.id, order.id));
    }
  } catch (err) {
    console.error("Payment initiation failed", err);
    await db
      .update(orders)
      .set({ paymentStatus: "cancelled" })
      .where(eq(orders.id, order.id));
    return {
      ok: false,
      error: "We couldn't start the payment. Please try again or use Zelle.",
    };
  }

  redirect(redirectUrl);
}
