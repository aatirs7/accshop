import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliates,
  commissions,
  deliverables,
  emailCaptures,
  orders,
  partners,
  payments,
} from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/resend";
import {
  AdminNotifyEmail,
  OrderConfirmationEmail,
} from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import { sendPushToAdmins } from "@/lib/push/send";

/**
 * The single paid-transition for BOTH rails: the Stripe webhook and the
 * admin's manual Zelle confirmation converge here so downstream behavior
 * (deliverables, commission, emails) is identical. Idempotent: an
 * already-paid order is a no-op.
 */
export async function markOrderPaid(
  orderId: string,
  opts: {
    method: "stripe" | "zelle";
    stripePaymentIntentId?: string;
    zelleReference?: string;
    confirmedByUserId?: string;
  },
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const result = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { product: true, user: true },
    });
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.paymentStatus === "paid") return { order, alreadyPaid: true };
    if (order.paymentStatus !== "pending") {
      throw new Error(
        `Order ${order.orderCode} is ${order.paymentStatus}, cannot mark paid`,
      );
    }

    await tx
      .update(orders)
      .set({
        paymentStatus: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
        zelleReference: opts.zelleReference ?? null,
      })
      .where(eq(orders.id, orderId));

    await tx.insert(payments).values({
      orderId,
      method: opts.method,
      amountCents: order.totalCents,
      stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
      zelleReference: opts.zelleReference ?? null,
      confirmedBy: opts.confirmedByUserId ?? null,
    });

    // One deliverable per account purchased, fulfillment tracks each
    // individually (supplier, cost, credentials, warranty claims).
    await tx.insert(deliverables).values(
      Array.from({ length: order.quantity }, () => ({
        orderId,
        status: "pending" as const,
      })),
    );

    // Referral commission: only for orders a partner referred (not their own
    // wholesale buys, which are already discounted).
    if (order.partnerId && order.source === "referral") {
      const partner = await tx.query.partners.findFirst({
        where: eq(partners.id, order.partnerId),
      });
      if (partner?.commissionRateBps) {
        await tx
          .insert(commissions)
          .values({
            partnerId: partner.id,
            orderId,
            amountCents: Math.round(
              (order.totalCents * partner.commissionRateBps) / 10_000,
            ),
          })
          .onConflictDoNothing();
      }
    }

    // Affiliate commission (self-serve referral): accrue at the affiliate's rate.
    if (order.affiliateId) {
      const affiliate = await tx.query.affiliates.findFirst({
        where: eq(affiliates.id, order.affiliateId),
      });
      if (affiliate) {
        await tx
          .insert(affiliateCommissions)
          .values({
            affiliateId: affiliate.id,
            orderId,
            amountCents: Math.round(
              (order.totalCents * affiliate.commissionRateBps) / 10_000,
            ),
          })
          .onConflictDoNothing();
      }
    }

    // Burn the one-time email-capture discount now that the order is paid.
    if (order.discountCode) {
      await tx
        .update(emailCaptures)
        .set({ redeemedAt: new Date() })
        .where(eq(emailCaptures.discountCode, order.discountCode));
    }

    return { order, alreadyPaid: false };
  });

  if (result.alreadyPaid) return { ok: true, alreadyPaid: true };

  const { order } = result;
  await audit({
    actorUserId: opts.confirmedByUserId ?? null,
    action: `order.mark_paid_${opts.method}`,
    entityType: "order",
    entityId: orderId,
    metadata: { orderCode: order.orderCode, totalCents: order.totalCents },
  });

  await sendEmail({
    to: order.user.email,
    subject: `Order confirmed, ${order.orderCode}`,
    react: OrderConfirmationEmail({
      orderCode: order.orderCode,
      productName: order.product.name,
      quantity: order.quantity,
      totalFormatted: formatMoney(order.totalCents),
      dashboardUrl: `${env.APP_URL}/dashboard`,
    }),
    text: `Payment received for order ${order.orderCode} (${order.quantity}× ${order.product.name}, ${formatMoney(order.totalCents)}). Track it: ${env.APP_URL}/dashboard`,
  });

  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject: `Paid order: ${order.orderCode}, ${formatMoney(order.totalCents)}`,
        react: AdminNotifyEmail({
          heading: "New paid order",
          lines: [
            `${order.orderCode}, ${order.quantity}× ${order.product.name}`,
            `Total: ${formatMoney(order.totalCents)} via ${opts.method}`,
            `Customer: ${order.user.email}`,
          ],
          url: `${env.APP_URL}/admin/orders/${order.orderCode}`,
        }),
        text: `New paid order ${order.orderCode}: ${order.quantity}× ${order.product.name}, ${formatMoney(order.totalCents)} via ${opts.method}`,
      }),
    ),
  );

  await sendPushToAdmins({
    title: `Sale: ${formatMoney(order.totalCents)}`,
    body: `${order.orderCode}, ${order.quantity}× ${order.product.name} via ${opts.method}`,
    url: `/admin/orders/${order.orderCode}`,
  });

  return { ok: true };
}
