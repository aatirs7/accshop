import { and, desc, eq, gt, gte, lt, notInArray, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  commissions,
  deliverables,
  orders,
  partners,
  products,
  users,
} from "@/lib/db/schema";
import { demoUserIds, testBuyerUserIds } from "@/lib/db/queries/demo-exclusion";

const paid = eq(orders.paymentStatus, "paid");

// Seeded demo orders (see scripts/seed.ts) and the owner's own test
// purchases never count toward real revenue/order numbers shown in the
// admin panel; callers merge this in via `and(...)` alongside `paid`. Test
// purchases still show up in the Orders list itself (see admin/orders/page),
// they're only excluded from these aggregate stats.
async function excludeDemo() {
  const [demoIds, testIds] = await Promise.all([demoUserIds(), testBuyerUserIds()]);
  const ids = [...demoIds, ...testIds];
  return ids.length ? notInArray(orders.userId, ids) : undefined;
}

export type DateRange = { from?: Date; to?: Date };

/**
 * Paid-order totals, optionally limited to a window on `paidAt`. Pass a
 * number of days for a rolling "last N days" window, or an explicit
 * `{ from, to }` range (either bound optional, `to` is exclusive) for the
 * overview's Today / Last 7 / Last 30 / Custom pickers.
 */
export async function revenueSummary(range?: number | DateRange) {
  const window: DateRange =
    typeof range === "number"
      ? { from: new Date(Date.now() - range * 86_400_000) }
      : (range ?? {});
  const since = window.from ? gte(orders.paidAt, window.from) : undefined;
  const until = window.to ? lt(orders.paidAt, window.to) : undefined;
  const notDemo = await excludeDemo();
  const filters = [paid, since, until, notDemo].filter(Boolean);
  const [row] = await db
    .select({
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(),
      accountsSold: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(orders)
    .where(and(...filters));

  // Cost per delivered account: the per-order override if set, else the
  // product's cost-per-account basis.
  const [costRow] = await db
    .select({
      costCents: sql<number>`coalesce(sum(coalesce(${deliverables.costCents}, ${products.costCents})), 0)`,
    })
    .from(deliverables)
    .innerJoin(orders, eq(deliverables.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(...filters));

  return {
    revenueCents: Number(row.revenueCents),
    costCents: Number(costRow.costCents),
    marginCents: Number(row.revenueCents) - Number(costRow.costCents),
    orderCount: Number(row.orderCount),
    accountsSold: Number(row.accountsSold),
  };
}

/** Stripe vs Zelle revenue split, the processor-risk gauge. */
export async function railMix() {
  const notDemo = await excludeDemo();
  return db
    .select({
      method: orders.paymentMethod,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(notDemo ? and(paid, notDemo) : paid)
    .groupBy(orders.paymentMethod);
}

export async function sourceMix() {
  const notDemo = await excludeDemo();
  return db
    .select({
      source: orders.source,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      accountsSold: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(orders)
    .where(notDemo ? and(paid, notDemo) : paid)
    .groupBy(orders.source);
}

export async function topCustomers(limit = 10) {
  const notDemo = await excludeDemo();
  return db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      ltvCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(orders.id),
      accountsBought: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(users)
    .innerJoin(
      orders,
      and(eq(orders.userId, users.id), paid, notDemo),
    )
    .groupBy(users.id, users.email, users.name, users.role)
    .orderBy(desc(sql`sum(${orders.totalCents})`))
    .limit(limit);
}

export async function commissionSummary() {
  const rows = await db
    .select({
      status: commissions.status,
      totalCents: sql<number>`coalesce(sum(${commissions.amountCents}), 0)`,
    })
    .from(commissions)
    .groupBy(commissions.status);
  return {
    accruedCents: Number(rows.find((r) => r.status === "accrued")?.totalCents ?? 0),
    paidCents: Number(rows.find((r) => r.status === "paid")?.totalCents ?? 0),
  };
}

export async function partnerVolumes() {
  const [demoIds, testIds] = await Promise.all([demoUserIds(), testBuyerUserIds()]);
  const excludedIds = [...demoIds, ...testIds];
  const notDemoPartner = excludedIds.length
    ? notInArray(partners.userId, excludedIds)
    : undefined;
  const notDemoOrder = excludedIds.length
    ? notInArray(orders.userId, excludedIds)
    : undefined;
  return db
    .select({
      partnerId: partners.id,
      businessName: partners.businessName,
      status: partners.status,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      accountsSold: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
      orderCount: count(orders.id),
    })
    .from(partners)
    .leftJoin(
      orders,
      and(eq(orders.partnerId, partners.id), paid, notDemoOrder),
    )
    .where(notDemoPartner)
    .groupBy(partners.id, partners.businessName, partners.status)
    .orderBy(desc(sql`coalesce(sum(${orders.totalCents}), 0)`));
}

export async function customerLtv(userId: string) {
  const notDemo = await excludeDemo();
  const filters = [eq(orders.userId, userId), paid, notDemo].filter(Boolean);
  const [row] = await db
    .select({
      ltvCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(),
      accountsBought: sql<number>`coalesce(sum(${orders.quantity}), 0)`,
    })
    .from(orders)
    .where(and(...filters));
  return {
    ltvCents: Number(row.ltvCents),
    orderCount: Number(row.orderCount),
    accountsBought: Number(row.accountsBought),
  };
}

/**
 * Compact paid-order history for the overview's client-side widgets (today
 * so far, streak, best day, 14-day chart). Three numbers per order, oldest
 * first, so the full history travels cheaply and buckets by the owner's
 * local day in the browser.
 */
export async function paidTimeline() {
  const notDemo = await excludeDemo();
  const rows = await db
    .select({
      paidAt: orders.paidAt,
      totalCents: orders.totalCents,
      quantity: orders.quantity,
    })
    .from(orders)
    .where(notDemo ? and(paid, notDemo) : paid)
    .orderBy(orders.paidAt);
  return rows
    .filter((r): r is typeof r & { paidAt: Date } => r.paidAt !== null)
    .map((r) => ({ t: r.paidAt.getTime(), c: r.totalCents, q: r.quantity }));
}

export type RecentSale = {
  orderCode: string;
  totalCents: number;
  quantity: number;
  productName: string;
  method: "stripe" | "zelle";
  customer: string;
  paidAt: number;
};

function toRecentSale(o: {
  orderCode: string;
  totalCents: number;
  quantity: number;
  paymentMethod: "stripe" | "zelle";
  paidAt: Date | null;
  product: { name: string };
  user: { name: string | null; email: string };
}): RecentSale {
  return {
    orderCode: o.orderCode,
    totalCents: o.totalCents,
    quantity: o.quantity,
    productName: o.product.name,
    method: o.paymentMethod,
    customer: o.user.name ?? o.user.email,
    paidAt: o.paidAt?.getTime() ?? 0,
  };
}

/** Newest paid orders for the overview's live sales feed. */
export async function recentSales(limit = 8): Promise<RecentSale[]> {
  const notDemo = await excludeDemo();
  const rows = await db.query.orders.findMany({
    where: notDemo ? and(paid, notDemo) : paid,
    with: { user: true, product: true },
    orderBy: desc(orders.paidAt),
    limit,
  });
  return rows.map(toRecentSale);
}

/**
 * Paid orders that landed after `since`, oldest first. Polled by the
 * overview so a fresh sale can ring the bell within seconds.
 */
export async function salesSince(since: Date, limit = 20): Promise<RecentSale[]> {
  const notDemo = await excludeDemo();
  const filters = [paid, gt(orders.paidAt, since), notDemo].filter(Boolean);
  const rows = await db.query.orders.findMany({
    where: and(...filters),
    with: { user: true, product: true },
    orderBy: orders.paidAt,
    limit,
  });
  return rows.map(toRecentSale);
}
