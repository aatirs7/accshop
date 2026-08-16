"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  affiliates,
  orders,
  partners,
  productVariants,
  products,
  users,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { resolveUnitPrice } from "@/lib/pricing";
import { generateOrderCode } from "@/lib/orders/code";
import { getProvider } from "@/lib/payments/provider";
import { stripeConfigured } from "@/lib/payments/stripe";
import { audit } from "@/lib/audit";

const checkoutSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  method: z.enum(["stripe"]).default("stripe"),
  ref: z.string().optional(),
  variantId: z.string().optional(),
  referralCode: z.string().trim().optional(),
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
  const { productSlug, quantity, ref, variantId, referralCode } = parsed.data;

  if (!stripeConfigured()) {
    return {
      ok: false,
      error:
        "Card checkout is being set up and will be live shortly. Please check back soon or contact support to order.",
    };
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, productSlug), eq(products.active, true)),
  });
  if (!product) return { ok: false, error: "This product is no longer available." };

  // Customers don't sign in — we upsert a lightweight user by email so orders
  // and referral attribution have something to hang on to.
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
      const [created] = await db.insert(users).values({ email }).returning();
      userId = created.id;
    }
  }

  const price = await resolveUnitPrice(userId, product.id, quantity);

  let source: "retail" | "partner" | "referral" = price.source;
  let partnerId = price.partnerId;
  let affiliateId: string | null = null;
  let attributedCode: string | null = null;

  // Referral: a code entered at checkout matches an affiliate first, then a
  // partner/coach code. ?ref=partnerId link still works for partners.
  const codeInput = (referralCode ?? "").trim().toUpperCase();
  if (codeInput) {
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.code, codeInput),
    });
    if (affiliate && affiliate.userId !== userId) {
      affiliateId = affiliate.id;
      attributedCode = affiliate.code;
      source = "referral";
    } else {
      const coach = await db.query.partners.findFirst({
        where: and(
          eq(partners.referralCode, codeInput),
          eq(partners.status, "approved"),
        ),
      });
      if (coach && coach.userId !== userId && price.source === "retail") {
        partnerId = coach.id;
        attributedCode = coach.referralCode;
        source = "referral";
      }
    }
  }
  if (!attributedCode && ref && price.source === "retail") {
    const refPartner = await db.query.partners.findFirst({
      where: and(eq(partners.id, ref), eq(partners.status, "approved")),
    });
    if (refPartner && refPartner.userId !== userId) {
      source = "referral";
      partnerId = refPartner.id;
    }
  }

  // Variant price delta (e.g. "Enable TikTok Shop" +$50).
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
  const totalCents = unitPriceCents * quantity;

  let order;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      [order] = await db
        .insert(orders)
        .values({
          orderCode: generateOrderCode(),
          userId,
          partnerId,
          affiliateId,
          referralCode: attributedCode,
          productId: product.id,
          quantity,
          unitPriceCents,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
          totalCents,
          paymentMethod: "stripe",
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
      quantity,
      totalCents,
      variant: variant?.label ?? null,
      referralCode: attributedCode,
    },
  });

  let redirectUrl: string;
  try {
    const initiated = await getProvider("stripe").initiate({
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
    return { ok: false, error: "We couldn't start your order. Please try again." };
  }

  redirect(redirectUrl);
}
