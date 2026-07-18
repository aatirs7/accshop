import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return (client ??= new Stripe(env.STRIPE_SECRET_KEY));
}

export function stripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

/**
 * Creates a Stripe Checkout Session for an order. Product naming stays
 * neutral (catalog name only) — marketing copy lives on our pages, not in
 * Stripe metadata. The webhook, not the redirect, is the sole authority for
 * marking the order paid.
 */
export async function createStripeCheckout(order: {
  id: string;
  orderCode: string;
  quantity: number;
  unitPriceCents: number;
  productName: string;
  customerEmail: string;
}): Promise<{ redirectUrl: string; checkoutSessionId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customerEmail,
    client_reference_id: order.id,
    metadata: { order_id: order.id, order_code: order.orderCode },
    line_items: [
      {
        quantity: order.quantity,
        price_data: {
          currency: "usd",
          unit_amount: order.unitPriceCents,
          product_data: { name: order.productName },
        },
      },
    ],
    success_url: `${env.APP_URL}/checkout/success?oc=${order.orderCode}`,
    cancel_url: `${env.APP_URL}/checkout/success?oc=${order.orderCode}&cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { redirectUrl: session.url, checkoutSessionId: session.id };
}
