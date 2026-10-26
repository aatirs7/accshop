import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateCommissions,
  affiliateLiveSessions,
  affiliates,
  orders,
  products,
  users,
} from "@/lib/db/schema";
import { normalizeCommissionStatus, type AffiliateCommissionStatus } from "./constants";
import { weekBounds } from "./live";

export interface CommissionRow {
  id: string;
  orderId: string;
  orderCode: string;
  productName: string;
  quantity: number;
  orderTotalCents: number;
  amountCents: number;
  status: AffiliateCommissionStatus;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  reversedAt: Date | null;
  reversalReason: string | null;
}

export interface MoneyTotals {
  /** pending + approved + paid (never counts reversed). */
  lifetimeCents: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  reversedCents: number;
  /** Orders that earned a commission and were not reversed. */
  salesCount: number;
  /** Accounts sold across those orders. */
  accountsSold: number;
}

export interface WeekPoint {
  weekStart: string; // YYYY-MM-DD (Monday)
  commissionCents: number; // earned that week, excluding reversed
  liveMinutes: number;
  liveSessions: number;
}

type TotalInput = { amountCents: number; quantity: number; status: AffiliateCommissionStatus };

function totalsOf(rows: TotalInput[]): MoneyTotals {
  const t: MoneyTotals = {
    lifetimeCents: 0,
    pendingCents: 0,
    approvedCents: 0,
    paidCents: 0,
    reversedCents: 0,
    salesCount: 0,
    accountsSold: 0,
  };
  for (const r of rows) {
    if (r.status === "reversed") {
      t.reversedCents += r.amountCents;
      continue;
    }
    t.lifetimeCents += r.amountCents;
    t.salesCount += 1;
    t.accountsSold += r.quantity;
    if (r.status === "pending") t.pendingCents += r.amountCents;
    else if (r.status === "approved") t.approvedCents += r.amountCents;
    else if (r.status === "paid") t.paidCents += r.amountCents;
  }
  return t;
}

function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Every commission for one affiliate, newest first, with its order. */
export async function getAffiliateCommissions(affiliateId: string): Promise<CommissionRow[]> {
  const rows = await db
    .select({
      id: affiliateCommissions.id,
      orderId: orders.id,
      orderCode: orders.orderCode,
      productName: products.name,
      quantity: orders.quantity,
      orderTotalCents: orders.totalCents,
      amountCents: affiliateCommissions.amountCents,
      status: affiliateCommissions.status,
      createdAt: affiliateCommissions.createdAt,
      approvedAt: affiliateCommissions.approvedAt,
      paidAt: affiliateCommissions.paidAt,
      reversedAt: affiliateCommissions.reversedAt,
      reversalReason: affiliateCommissions.reversalReason,
    })
    .from(affiliateCommissions)
    .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .innerJoin(products, eq(products.id, orders.productId))
    .where(eq(affiliateCommissions.affiliateId, affiliateId))
    .orderBy(desc(affiliateCommissions.createdAt));
  return rows.map((r) => ({ ...r, status: normalizeCommissionStatus(r.status) }));
}

export async function getAffiliateLiveSessions(affiliateId: string, limit = 100) {
  return db
    .select()
    .from(affiliateLiveSessions)
    .where(eq(affiliateLiveSessions.affiliateId, affiliateId))
    .orderBy(desc(affiliateLiveSessions.sessionDate), desc(affiliateLiveSessions.createdAt))
    .limit(limit);
}

/**
 * Everything the affiliate dashboard shows. `todayKey` is the viewer's local
 * day (YYYY-MM-DD) so "this week" lines up with their calendar.
 */
export async function getAffiliateDashboard(affiliateId: string, todayKey: string, weeks = 8) {
  const affiliate = await db.query.affiliates.findFirst({ where: eq(affiliates.id, affiliateId) });
  if (!affiliate) throw new Error("Affiliate not found");

  const commissions = await getAffiliateCommissions(affiliateId);
  const totals = totalsOf(commissions);

  const thisWeek = weekBounds(todayKey);
  const firstWeekStart = addDays(thisWeek.start, -7 * (weeks - 1));

  const sessions = await db
    .select()
    .from(affiliateLiveSessions)
    .where(
      and(
        eq(affiliateLiveSessions.affiliateId, affiliateId),
        gte(affiliateLiveSessions.sessionDate, firstWeekStart),
        lte(affiliateLiveSessions.sessionDate, thisWeek.end),
      ),
    );

  const series: WeekPoint[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(firstWeekStart, 7 * i),
    commissionCents: 0,
    liveMinutes: 0,
    liveSessions: 0,
  }));
  const bucket = (dayKey: string) => series.findIndex((w) => weekBounds(dayKey).start === w.weekStart);
  for (const s of sessions) {
    const i = bucket(s.sessionDate);
    if (i >= 0) {
      series[i].liveMinutes += s.durationMinutes;
      series[i].liveSessions += 1;
    }
  }
  for (const c of commissions) {
    if (c.status === "reversed") continue;
    const i = bucket(c.createdAt.toISOString().slice(0, 10));
    if (i >= 0) series[i].commissionCents += c.amountCents;
  }

  const current = series[series.length - 1];
  return {
    affiliate,
    totals,
    commissions,
    series,
    week: {
      ...thisWeek,
      liveMinutes: current.liveMinutes,
      liveSessions: current.liveSessions,
      hoursGoal: affiliate.weeklyLiveHoursGoal,
      sessionsGoal: affiliate.weeklyLiveSessionsGoal,
    },
  };
}

export interface AffiliateOverviewRow {
  id: string;
  code: string;
  username: string | null;
  name: string | null;
  email: string;
  status: "active" | "suspended" | "deactivated";
  payoutMethod: string | null;
  payoutHandle: string | null;
  createdAt: Date;
  totals: MoneyTotals;
  weekLiveMinutes: number;
  weekLiveSessions: number;
  lastLiveDate: string | null;
}

/** One row per affiliate for the admin list. `todayKey` sets "this week". */
export async function getAffiliatesOverview(todayKey: string): Promise<AffiliateOverviewRow[]> {
  const list = await db
    .select({
      id: affiliates.id,
      code: affiliates.code,
      username: affiliates.username,
      name: users.name,
      email: users.email,
      status: affiliates.status,
      payoutMethod: affiliates.payoutMethod,
      payoutHandle: affiliates.payoutHandle,
      createdAt: affiliates.createdAt,
    })
    .from(affiliates)
    .innerJoin(users, eq(users.id, affiliates.userId))
    .orderBy(desc(affiliates.createdAt));
  if (list.length === 0) return [];
  const ids = list.map((a) => a.id);

  const comm = await db
    .select({
      affiliateId: affiliateCommissions.affiliateId,
      amountCents: affiliateCommissions.amountCents,
      status: affiliateCommissions.status,
      quantity: orders.quantity,
    })
    .from(affiliateCommissions)
    .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .where(inArray(affiliateCommissions.affiliateId, ids));

  const week = weekBounds(todayKey);
  const live = await db
    .select({
      affiliateId: affiliateLiveSessions.affiliateId,
      sessionDate: affiliateLiveSessions.sessionDate,
      durationMinutes: affiliateLiveSessions.durationMinutes,
    })
    .from(affiliateLiveSessions)
    .where(inArray(affiliateLiveSessions.affiliateId, ids));

  return list.map((a) => {
    const totals = totalsOf(
      comm
        .filter((c) => c.affiliateId === a.id)
        .map((c) => ({ amountCents: c.amountCents, quantity: c.quantity, status: normalizeCommissionStatus(c.status) })),
    );
    const mine = live.filter((l) => l.affiliateId === a.id);
    const inWeek = mine.filter((l) => l.sessionDate >= week.start && l.sessionDate <= week.end);
    const lastLiveDate = mine.reduce<string | null>((m, l) => (m && m > l.sessionDate ? m : l.sessionDate), null);
    return {
      ...a,
      totals,
      weekLiveMinutes: inWeek.reduce((s, l) => s + l.durationMinutes, 0),
      weekLiveSessions: inWeek.length,
      lastLiveDate,
    };
  });
}
