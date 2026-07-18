import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/resend";
import { ZelleInstructionsEmail } from "@/lib/email/templates";
import { createStripeCheckout } from "./stripe";

export type PaymentMethod = "stripe" | "zelle";

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
};

export function getProvider(method: PaymentMethod): PaymentProvider {
  return providers[method];
}
