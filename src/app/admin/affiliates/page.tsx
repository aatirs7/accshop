import { requireAdminPage } from "@/lib/auth-helpers";
import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates, orders, products, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { getAffiliatesOverview } from "@/lib/affiliates/stats";
import { formatDuration } from "@/lib/affiliates/live";
import {
  AFFILIATE_JOIN_PATH,
  normalizeCommissionStatus,
  payoutMethodLabel,
} from "@/lib/affiliates/constants";
import { approveAllPendingCommissions } from "@/actions/admin/affiliates";
import { CopyField } from "@/components/dashboard/copy-field";
import { AddAffiliateForm } from "@/components/admin/affiliates/add-affiliate-form";
import { AffiliatesList, type AffiliateListRow } from "@/components/admin/affiliates/affiliates-list";
import { CommissionActions } from "@/components/admin/affiliates/commission-actions";
import { ConfirmAction } from "@/components/admin/affiliates/confirm-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl text-brand-gold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function dayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return formatDate(new Date(y, m - 1, d));
}

/** Every pending and approved commission, oldest first, with who to pay. */
async function getCommissionQueue() {
  const rows = await db
    .select({
      id: affiliateCommissions.id,
      status: affiliateCommissions.status,
      amountCents: affiliateCommissions.amountCents,
      createdAt: affiliateCommissions.createdAt,
      approvedAt: affiliateCommissions.approvedAt,
      affiliateId: affiliates.id,
      code: affiliates.code,
      username: affiliates.username,
      payoutMethod: affiliates.payoutMethod,
      payoutHandle: affiliates.payoutHandle,
      affiliateStatus: affiliates.status,
      name: users.name,
      email: users.email,
      orderCode: orders.orderCode,
      quantity: orders.quantity,
      productName: products.name,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .innerJoin(users, eq(users.id, affiliates.userId))
    .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
    .innerJoin(products, eq(products.id, orders.productId))
    .where(inArray(affiliateCommissions.status, ["pending", "accrued", "approved"]))
    .orderBy(asc(affiliateCommissions.createdAt));
  return rows.map((r) => ({ ...r, status: normalizeCommissionStatus(r.status) }));
}

type QueueRow = Awaited<ReturnType<typeof getCommissionQueue>>[number];

function payoutLine(r: { payoutMethod: string | null; payoutHandle: string | null }): string {
  if (!r.payoutMethod || !r.payoutHandle) return "No payout method set";
  return `${payoutMethodLabel(r.payoutMethod)}: ${r.payoutHandle}`;
}

function QueueItem({ r }: { r: QueueRow }) {
  const who = r.name ?? r.email;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm">
          <span className="font-display text-xl text-brand-gold">{formatMoney(r.amountCents)}</span>
          <span className="ml-2 text-muted-foreground">for</span>{" "}
          <Link href={`/admin/affiliates/${r.affiliateId}`} className="font-medium hover:text-brand-gold">
            {who}
          </Link>
          {r.username && <span className="ml-1 text-xs text-muted-foreground">@{r.username}</span>}
          <span className="ml-2 font-mono text-xs text-brand-gold">{r.code}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          <Link href={`/admin/orders/${r.orderCode}`} className="font-mono hover:text-foreground">
            {r.orderCode}
          </Link>{" "}
          · {r.productName} x{r.quantity} · earned {formatDate(r.createdAt)}
          {r.approvedAt && <> · approved {formatDate(r.approvedAt)}</>}
          {r.affiliateStatus !== "active" && (
            <span className="ml-1 capitalize text-brand-warning">· affiliate {r.affiliateStatus}</span>
          )}
        </p>
        {r.status === "approved" && (
          <p
            className={`inline-block rounded-md border px-2 py-1 text-sm font-medium ${
              r.payoutMethod && r.payoutHandle
                ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            Send to {payoutLine(r)}
          </p>
        )}
      </div>
      <div className="shrink-0">
        <CommissionActions
          id={r.id}
          status={r.status}
          amountLabel={formatMoney(r.amountCents)}
          payoutLabel={r.payoutMethod && r.payoutHandle ? payoutLine(r) : undefined}
          compact
        />
      </div>
    </div>
  );
}

export default async function AdminAffiliatesPage() {
  await requireAdminPage();
  const todayKey = new Date().toISOString().slice(0, 10);
  const [overview, queue] = await Promise.all([
    getAffiliatesOverview(todayKey),
    getCommissionQueue(),
  ]);

  const sum = (f: (r: (typeof overview)[number]) => number) =>
    overview.reduce((s, r) => s + f(r), 0);
  const activeCount = overview.filter((r) => r.status === "active").length;
  const salesCount = sum((r) => r.totals.salesCount);
  const accountsSold = sum((r) => r.totals.accountsSold);
  const pendingCents = sum((r) => r.totals.pendingCents);
  const approvedCents = sum((r) => r.totals.approvedCents);
  const paidCents = sum((r) => r.totals.paidCents);
  const weekMinutes = sum((r) => r.weekLiveMinutes);
  const weekSessions = sum((r) => r.weekLiveSessions);

  const pendingQueue = queue.filter((r) => r.status === "pending");
  const approvedQueue = queue.filter((r) => r.status === "approved");

  const listRows: AffiliateListRow[] = overview.map((r) => ({
    id: r.id,
    name: r.name ?? r.email,
    username: r.username,
    email: r.email,
    code: r.code,
    status: r.status,
    salesCount: r.totals.salesCount,
    accountsSold: r.totals.accountsSold,
    lifetimeCents: r.totals.lifetimeCents,
    pendingCents: r.totals.pendingCents,
    approvedCents: r.totals.approvedCents,
    paidCents: r.totals.paidCents,
    weekLiveMinutes: r.weekLiveMinutes,
    weekLiveSessions: r.weekLiveSessions,
    lastLiveLabel: r.lastLiveDate ? dayLabel(r.lastLiveDate) : null,
    createdAtMs: r.createdAt.getTime(),
  }));

  const joinUrl = `${env.APP_URL}${AFFILIATE_JOIN_PATH}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Affiliates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            $100 per account sold. Approve new commissions, pay out approved
            ones, and keep an eye on LIVE activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/affiliates/export?type=affiliates" download>
              <Download />
              Affiliates CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/affiliates/export?type=commissions" download>
              <Download />
              Commissions CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Active affiliates"
          value={String(activeCount)}
          hint={`${overview.length} total`}
        />
        <Stat
          label="Affiliate sales"
          value={String(salesCount)}
          hint={`${accountsSold} account${accountsSold === 1 ? "" : "s"} sold, not counting reversals`}
        />
        <Stat
          label="Pending approval"
          value={formatMoney(pendingCents)}
          hint={`${pendingQueue.length} commission${pendingQueue.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Approved, awaiting payout"
          value={formatMoney(approvedCents)}
          hint={`${approvedQueue.length} commission${approvedQueue.length === 1 ? "" : "s"}`}
        />
        <Stat label="Paid out" value={formatMoney(paidCents)} hint="All time" />
        <Stat
          label="LIVE this week"
          value={formatDuration(weekMinutes)}
          hint={`${weekSessions} session${weekSessions === 1 ? "" : "s"} across all affiliates (UTC week)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite affiliates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Signup link" value={joinUrl} />
          <p className="text-xs text-muted-foreground">
            Send this link. They pick their own code and payout method, and
            start earning as soon as they join. Or add someone yourself:
          </p>
          <AddAffiliateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Pending approval ({pendingQueue.length})</CardTitle>
          {pendingQueue.length > 1 && (
            <ConfirmAction
              action={approveAllPendingCommissions.bind(null, undefined)}
              question={`Approve all ${pendingQueue.length} (${formatMoney(pendingCents)})?`}
              confirmLabel="Approve all"
              successText="All pending commissions approved"
            >
              Approve all pending
            </ConfirmAction>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingQueue.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing waiting for approval.
            </p>
          ) : (
            pendingQueue.map((r) => <QueueItem key={r.id} r={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved, ready to pay ({approvedQueue.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Send the money to the payout handle shown, then mark it paid.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvedQueue.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing to pay out right now.
            </p>
          ) : (
            approvedQueue.map((r) => <QueueItem key={r.id} r={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All affiliates</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliatesList rows={listRows} />
        </CardContent>
      </Card>
    </div>
  );
}
