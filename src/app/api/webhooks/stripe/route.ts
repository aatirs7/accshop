import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, webhookEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/payments/stripe";
import { markOrderPaid } from "@/lib/payments/mark-paid";

export const runtime = "nodejs";

/**
 * Sole authority for Stripe paid-transitions. The success redirect never
 * marks anything paid. Idempotent via webhook_events (unique external id).
 */
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Duplicate delivery → no-op. The unique index is the guard.
  try {
    await db.insert(webhookEvents).values({
      provider: "stripe",
      externalEventId: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (orderId) {
        await markOrderPaid(orderId, {
          method: "stripe",
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : undefined,
        });
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (orderId) {
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });
        if (order?.paymentStatus === "pending") {
          await db
            .update(orders)
            .set({ paymentStatus: "cancelled" })
            .where(eq(orders.id, orderId));
        }
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const intentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (intentId) {
        await db
          .update(orders)
          .set({ paymentStatus: "refunded" })
          .where(eq(orders.stripePaymentIntentId, intentId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
