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
 * neutral (catalog name only), marketing copy lives on our pages, not in
 * Stripe metadata. The webhook, not the redirect, is the sole authority for
 * marking the order paid.
 */
export async function createStripeCheckout(order: {
  id: string;
  orderCode: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  productName: string;
  customerEmail: string;
}): Promise<{ redirectUrl: string; checkoutSessionId: string }> {
  const stripe = getStripe();
  // Single line priced at the final order total (already reflects variant and
  // any discount), so the charge always matches our recorded total exactly.
  const lineName =
    order.quantity > 1
      ? `${order.productName} (×${order.quantity})`
      : order.productName;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customerEmail,
    client_reference_id: order.id,
    metadata: { order_id: order.id, order_code: order.orderCode },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: order.totalCents,
          product_data: { name: lineName },
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

/**
 * Mirrors a catalog product into Stripe so the Stripe dashboard always has a
 * matching Product/Price to report and reconcile against. Stripe Prices are
 * immutable, so a price change creates a new Price and re-points the
 * product's default_price at it rather than editing one in place; the
 * Product itself is reused (created once, updated after) so price edits
 * don't pile up duplicate Products in the dashboard.
 */
export async function syncStripeProduct(product: {
  id: string;
  name: string;
  retailPriceCents: number;
  active: boolean;
  stripeProductId: string | null;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const stripe = getStripe();

  const stripeProductId = product.stripeProductId
    ? (
        await stripe.products.update(product.stripeProductId, {
          name: product.name,
          active: product.active,
        })
      ).id
    : (
        await stripe.products.create({
          name: product.name,
          active: product.active,
          metadata: { app_product_id: product.id },
        })
      ).id;

  const price = await stripe.prices.create({
    product: stripeProductId,
    unit_amount: product.retailPriceCents,
    currency: "usd",
  });
  await stripe.products.update(stripeProductId, { default_price: price.id });

  return { stripeProductId, stripePriceId: price.id };
}
