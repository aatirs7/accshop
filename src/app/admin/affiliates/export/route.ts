import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates, orders, products, users } from "@/lib/db/schema";
import { getAffiliatesOverview } from "@/lib/affiliates/stats";
import { normalizeCommissionStatus, payoutMethodLabel } from "@/lib/affiliates/constants";

type Cell = string | number | null | undefined;

/**
 * One CSV cell. Quotes when needed, doubles embedded quotes, and prefixes a
 * quote mark on values a spreadsheet would read as a formula (payout handles
 * like "@name" or "+1555..." would otherwise be evaluated).
 */
function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

const dollars = (cents: number) => (cents / 100).toFixed(2);
const iso = (d: Date | null) => (d ? d.toISOString() : "");

async function affiliatesCsv(todayKey: string): Promise<string> {
  const rows = await getAffiliatesOverview(todayKey);
  return toCsv(
    [
      "id",
      "name",
      "username",
      "email",
      "code",
      "status",
      "payout_method",
      "payout_handle",
      "joined",
      "sales",
      "accounts_sold",
      "lifetime_usd",
      "pending_usd",
      "approved_usd",
      "paid_usd",
      "reversed_usd",
      "live_minutes_this_week",
      "live_sessions_this_week",
      "last_live_date",
    ],
    rows.map((r) => [
      r.id,
      r.name,
      r.username,
      r.email,
      r.code,
      r.status,
      r.payoutMethod ? payoutMethodLabel(r.payoutMethod) : "",
      r.payoutHandle,
      iso(r.createdAt),
      r.totals.salesCount,
      r.totals.accountsSold,
      dollars(r.totals.lifetimeCents),
      dollars(r.totals.pendingCents),
      dollars(r.totals.approvedCents),
      dollars(r.totals.paidCents),
      dollars(r.totals.reversedCents),
      r.weekLiveMinutes,
      r.weekLiveSessions,
      r.lastLiveDate,
    ]),
  );
}

async function commissionsCsv(): Promise<string> {
  const rows = await db
    .select({
      id: affiliateCommissions.id,
      status: affiliateCommissions.status,
      amountCents: affiliateCommissions.amountCents,
      createdAt: affiliateCommissions.createdAt,
      approvedAt: affiliateCommissions.approvedAt,
      paidAt: affiliateCommissions.paidAt,
      reversedAt: affiliateCommissions.reversedAt,
      reversalReason: affiliateCommissions.reversalReason,
      code: affiliates.code,
      username: affiliates.username,
      payoutMethod: affiliates.payoutMethod,
      payoutHandle: affiliates.payoutHandle,
      name: users.name,
      email: users.email,
      orderCode: orders.orderCode,
      quantity: orders.quantity,
      orderTotalCents: orders.totalCents,
      productName: products.name,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .innerJoin(users, eq(users.id, affiliates.userId))
    .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .innerJoin(products, eq(products.id, orders.productId))
    .orderBy(desc(affiliateCommissions.createdAt));

  return toCsv(
    [
      "id",
      "affiliate_code",
      "affiliate_name",
      "affiliate_username",
      "affiliate_email",
      "payout_method",
      "payout_handle",
      "order_code",
      "product",
      "quantity",
      "order_total_usd",
      "commission_usd",
      "status",
      "earned_at",
      "approved_at",
      "paid_at",
      "reversed_at",
      "reversal_reason",
    ],
    rows.map((r) => [
      r.id,
      r.code,
      r.name,
      r.username,
      r.email,
      r.payoutMethod ? payoutMethodLabel(r.payoutMethod) : "",
      r.payoutHandle,
      r.orderCode,
      r.productName,
      r.quantity,
      dollars(r.orderTotalCents),
      dollars(r.amountCents),
      normalizeCommissionStatus(r.status),
      iso(r.createdAt),
      iso(r.approvedAt),
      iso(r.paidAt),
      iso(r.reversedAt),
      r.reversalReason,
    ]),
  );
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "affiliates" && type !== "commissions") {
    return new Response("type must be affiliates or commissions", { status: 400 });
  }
  const todayKey = new Date().toISOString().slice(0, 10);
  const csv = type === "affiliates" ? await affiliatesCsv(todayKey) : await commissionsCsv();
  await audit({
    actorUserId: admin.id,
    action: "affiliate.exported",
    entityType: "affiliate",
    metadata: { type },
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="affiliate-${type}-${todayKey}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
