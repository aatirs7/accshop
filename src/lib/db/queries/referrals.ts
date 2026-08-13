import { desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliates,
  commissions,
  orders,
  partners,
} from "@/lib/db/schema";

export interface ReferralRow {
  orderCode: string;
  studentEmail: string;
  createdAt: Date;
  paymentStatus: string;
  fulfillmentStatus: string;
  quantity: number;
  totalCents: number;
  commissionCents: number;
  commissionStatus: string | null;
}

export interface ReferralDashboard {
  isReferrer: boolean;
  code: string | null;
  commissionRateBps: number;
  rows: ReferralRow[];
  paidCount: number;
  accruedCents: number;
  paidCents: number;
}

/**
 * A unified referral view for affiliates and coaches (partners). Lists every
 * order attributed to this user's affiliate code or partner referral, with
 * per-order fulfillment status and commission.
 */
export async function referralDashboard(
  userId: string,
): Promise<ReferralDashboard> {
  const [affiliate, partner] = await Promise.all([
    db.query.affiliates.findFirst({ where: eq(affiliates.userId, userId) }),
    db.query.partners.findFirst({ where: eq(partners.userId, userId) }),
  ]);

  if (!affiliate && !partner) {
    return {
      isReferrer: false,
      code: null,
      commissionRateBps: 1000,
      rows: [],
      paidCount: 0,
      accruedCents: 0,
      paidCents: 0,
    };
  }

  const conditions = [];
  if (affiliate) conditions.push(eq(orders.affiliateId, affiliate.id));
  if (partner) conditions.push(eq(orders.partnerId, partner.id));

  const referredOrders = await db.query.orders.findMany({
    where: conditions.length === 1 ? conditions[0] : or(...conditions),
    with: { user: true },
    orderBy: desc(orders.createdAt),
    limit: 200,
  });

  // Commission ledgers keyed by orderId.
  const [affComms, partnerComms] = await Promise.all([
    affiliate
      ? db.query.affiliateCommissions.findMany({
          where: eq(affiliateCommissions.affiliateId, affiliate.id),
        })
      : Promise.resolve([]),
    partner
      ? db.query.commissions.findMany({
          where: eq(commissions.partnerId, partner.id),
        })
      : Promise.resolve([]),
  ]);
  const commByOrder = new Map<string, { amountCents: number; status: string }>();
  for (const c of affComms)
    commByOrder.set(c.orderId, { amountCents: c.amountCents, status: c.status });
  for (const c of partnerComms)
    commByOrder.set(c.orderId, { amountCents: c.amountCents, status: c.status });

  const rows: ReferralRow[] = referredOrders.map((o) => {
    const comm = commByOrder.get(o.id);
    return {
      orderCode: o.orderCode,
      studentEmail: o.user.email,
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      quantity: o.quantity,
      totalCents: o.totalCents,
      commissionCents: comm?.amountCents ?? 0,
      commissionStatus: comm?.status ?? null,
    };
  });

  const accruedCents = [...commByOrder.values()]
    .filter((c) => c.status === "accrued")
    .reduce((s, c) => s + c.amountCents, 0);
  const paidCents = [...commByOrder.values()]
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amountCents, 0);
  const paidCount = referredOrders.filter(
    (o) => o.paymentStatus === "paid",
  ).length;

  return {
    isReferrer: true,
    code: affiliate?.code ?? partner?.referralCode ?? null,
    commissionRateBps:
      affiliate?.commissionRateBps ?? partner?.commissionRateBps ?? 1000,
    rows,
    paidCount,
    accruedCents,
    paidCents,
  };
}
