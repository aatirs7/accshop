import { and, desc, eq, gte, lt, notInArray, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bulkSales,
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

/**
 * Hand-entered bulk orders to coaches (see `bulkSales` in the schema),
 * optionally limited to a window on `soldAt` with the same `{ from, to }`
 * semantics as `revenueSummary`. These never pass through checkout, so the
 * owner's typed-in revenue and profit are taken as-is.
 */
export async function bulkSalesSummary(range?: DateRange) {
  const since = range?.from ? gte(bulkSales.soldAt, range.from) : undefined;
  const until = range?.to ? lt(bulkSales.soldAt, range.to) : undefined;
  const filters = [since, until].filter(Boolean);
  const [row] = await db
    .select({
      revenueCents: sql<number>`coalesce(sum(${bulkSales.revenueCents}), 0)`,
      profitCents: sql<number>`coalesce(sum(${bulkSales.profitCents}), 0)`,
      saleCount: count(),
      accountsSold: sql<number>`coalesce(sum(${bulkSales.accounts}), 0)`,
    })
    .from(bulkSales)
    .where(filters.length ? and(...filters) : undefined);
  return {
    revenueCents: Number(row.revenueCents),
    profitCents: Number(row.profitCents),
    saleCount: Number(row.saleCount),
    accountsSold: Number(row.accountsSold),
  };
}

/** Most recent bulk sales, newest first, for the Overview's entry log. */
export async function recentBulkSales(limit = 20) {
  return db
    .select()
    .from(bulkSales)
    .orderBy(desc(bulkSales.soldAt), desc(bulkSales.createdAt))
    .limit(limit);
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
