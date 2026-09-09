import { and, desc, eq, gte, notInArray, sql, count, type SQL } from "drizzle-orm";
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

// Day boundaries for "today" / daily charts / streaks. The shop sells to US
// buyers (Zelle is US-only), so days roll over on US Eastern time rather than
// the server's UTC clock.
export const REPORTING_TZ = "America/New_York";

/** Calendar day of `paid_at` in the business timezone, as YYYY-MM-DD. */
// Inlined as a literal (not a bound param): Postgres requires the GROUP BY
// expression to match the SELECT expression exactly, and separate params
// ($1 vs $2) don't.
const tzLiteral = sql.raw(`'${REPORTING_TZ}'`);
const paidDay = sql<string>`to_char((${orders.paidAt} at time zone ${tzLiteral})::date, 'YYYY-MM-DD')`;
const todayDay = sql`to_char((now() at time zone ${tzLiteral})::date, 'YYYY-MM-DD')`;

/** Today's date (YYYY-MM-DD) in the business timezone, computed in JS. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function revenueSummary(sinceDays?: number) {
  const since = sinceDays
    ? gte(orders.paidAt, new Date(Date.now() - sinceDays * 86_400_000))
    : undefined;
  return summarize([since]);
}

/** Paid revenue since midnight today (business timezone). */
export async function todaySummary() {
  return summarize([sql`${paidDay} = ${todayDay}`]);
}

async function summarize(extra: Array<SQL | undefined>) {
  const notDemo = await excludeDemo();
  const filters = [paid, ...extra, notDemo].filter(Boolean);
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
 * Paid revenue per calendar day (business timezone) for the last `days`
 * days. Days with no sales are omitted; callers fill the gaps.
 */
export async function dailyRevenue(days: number) {
  const notDemo = await excludeDemo();
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({
      day: paidDay,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(and(paid, gte(orders.paidAt, since), notDemo))
    .groupBy(paidDay)
    .orderBy(paidDay);
  return rows.map((r) => ({
    day: r.day,
    revenueCents: Number(r.revenueCents),
    orderCount: Number(r.orderCount),
  }));
}

/** The single best sales day ever, for the "new record" moment. */
export async function bestDay() {
  const notDemo = await excludeDemo();
  const [row] = await db
    .select({
      day: paidDay,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(notDemo ? and(paid, notDemo) : paid)
    .groupBy(paidDay)
    .orderBy(desc(sql`sum(${orders.totalCents})`))
    .limit(1);
  return row
    ? {
        day: row.day,
        revenueCents: Number(row.revenueCents),
        orderCount: Number(row.orderCount),
      }
    : null;
}

export interface RecentSale {
  id: string;
  orderCode: string;
  totalCents: number;
  quantity: number;
  paymentMethod: "stripe" | "zelle";
  source: string;
  productName: string;
  customerName: string | null;
  customerEmail: string;
  paidAt: Date;
}

/** Newest paid orders, for the live sales feed and the new-sale poller. */
export async function recentSales(limit = 8): Promise<RecentSale[]> {
  const notDemo = await excludeDemo();
  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      totalCents: orders.totalCents,
      quantity: orders.quantity,
      paymentMethod: orders.paymentMethod,
      source: orders.source,
      productName: products.name,
      customerName: users.name,
      customerEmail: users.email,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(notDemo ? and(paid, notDemo) : paid)
    .orderBy(desc(orders.paidAt), desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    paidAt: r.paidAt ?? new Date(0),
  }));
}
