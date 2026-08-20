import { and, desc, eq, gte, notInArray, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  commissions,
  deliverables,
  orders,
  partners,
  products,
  users,
} from "@/lib/db/schema";
import { demoUserIds } from "@/lib/db/queries/demo-exclusion";

const paid = eq(orders.paymentStatus, "paid");

// Seeded demo orders (see scripts/seed.ts) never count as real sales;
// callers merge this in via `and(...)` alongside `paid`.
async function excludeDemo() {
  const ids = await demoUserIds();
  return ids.length ? notInArray(orders.userId, ids) : undefined;
}

export async function revenueSummary(sinceDays?: number) {
  const since = sinceDays
    ? gte(orders.paidAt, new Date(Date.now() - sinceDays * 86_400_000))
    : undefined;
  const notDemo = await excludeDemo();
  const filters = [paid, since, notDemo].filter(Boolean);
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
  const demoIds = await demoUserIds();
  const notDemoPartner = demoIds.length ? notInArray(partners.userId, demoIds) : undefined;
  const notDemoOrder = demoIds.length ? notInArray(orders.userId, demoIds) : undefined;
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
