import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/resend";
import {
  AppPaymentInstructionsEmail,
  ZelleInstructionsEmail,
} from "@/lib/email/templates";
import { appRail, type AppRail } from "./app-rails";
import { createStripeCheckout } from "./stripe";

export type PaymentMethod = "stripe" | "zelle" | AppRail;

export interface InitiateOrder {
  id: string;
  orderCode: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  productName: string;
  customerEmail: string;
}

interface PaymentProvider {
  id: PaymentMethod;
  /** Returns where to send the buyer next; may persist provider references. */
  initiate(order: InitiateOrder): Promise<{
    redirectUrl: string;
    checkoutSessionId?: string;
  }>;
}

/**
 * The rest of the app never imports Stripe (or any processor) directly,
 * adding a replacement rail is one new entry here.
 */
const providers: Record<PaymentMethod, PaymentProvider> = {
  stripe: {
    id: "stripe",
    initiate: (order) => createStripeCheckout(order),
  },
  zelle: {
    id: "zelle",
    async initiate(order) {
      const instructionsUrl = `${env.APP_URL}/checkout/zelle/${order.orderCode}`;
      // Instructions also go by email so they survive a closed tab.
      await sendEmail({
        to: order.customerEmail,
        subject: `Complete your order ${order.orderCode} via Zelle`,
        react: ZelleInstructionsEmail({
          orderCode: order.orderCode,
          totalFormatted: formatMoney(order.totalCents),
          recipientName: env.ZELLE_RECIPIENT_NAME,
          recipientHandle: env.ZELLE_RECIPIENT_HANDLE,
          instructionsUrl,
        }),
        text: `Send ${formatMoney(order.totalCents)} via Zelle to ${env.ZELLE_RECIPIENT_NAME} (${env.ZELLE_RECIPIENT_HANDLE}). Put order code ${order.orderCode} in the memo. Details: ${instructionsUrl}`,
      });
      return { redirectUrl: instructionsUrl };
    },
  },
  ...appRailProviders(),
};

/**
 * PayPal / Venmo / Cash App all behave the same way: we hold the order, point
 * the buyer at the owner's payment link with the order code as the note, and
 * the admin confirms the money landed.
 */
function appRailProviders(): Record<AppRail, PaymentProvider> {
  const build = (id: AppRail): PaymentProvider => ({
    id,
    async initiate(order) {
      const rail = appRail(id);
      const instructionsUrl = `${env.APP_URL}/checkout/pay/${order.orderCode}`;
      // Instructions also go by email so they survive a closed tab.
      await sendEmail({
        to: order.customerEmail,
        subject: `Complete your order ${order.orderCode} via ${rail.label}`,
        react: AppPaymentInstructionsEmail({
          orderCode: order.orderCode,
          totalFormatted: formatMoney(order.totalCents),
          methodLabel: rail.label,
          noteLabel: rail.noteLabel,
          payUrl: rail.payUrl,
          instructionsUrl,
        }),
        text: `Send ${formatMoney(order.totalCents)} with ${rail.label} (${rail.payUrl}). Put order code ${order.orderCode} in the ${rail.noteLabel}. Details: ${instructionsUrl}`,
      });
      return { redirectUrl: instructionsUrl };
    },
  });
  return { paypal: build("paypal"), venmo: build("venmo"), cashapp: build("cashapp") };
}

export function getProvider(method: PaymentMethod): PaymentProvider {
  return providers[method];
}
