import { requireAdminPage } from "@/lib/auth-helpers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { getAffiliateDashboard, getAffiliateLiveSessions } from "@/lib/affiliates/stats";
import { formatDuration } from "@/lib/affiliates/live";
import { payoutMethodLabel } from "@/lib/affiliates/constants";
import {
  approveAllPendingCommissions,
  markAffiliateCommissionsPaid,
} from "@/actions/admin/affiliates";
import { AffiliateStatusBadge, CommissionStatusBadge } from "@/components/admin/affiliates/badges";
import { CommissionActions } from "@/components/admin/affiliates/commission-actions";
import { ConfirmAction } from "@/components/admin/affiliates/confirm-action";
import {
  CodeForm,
  GoalsForm,
  StatusControls,
} from "@/components/admin/affiliates/profile-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return formatDate(new Date(y, m - 1, d));
}

function shortDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone ?? "text-brand-gold"}`}>{value}</p>
    </div>
  );
}

/** Simple bar chart: one column per week, height relative to the max. */
function WeekBars({
  points,
  value,
  format,
  barClass,
}: {
  points: { weekStart: string }[];
  value: (i: number) => number;
  format: (v: number) => string;
  barClass: string;
}) {
  const values = points.map((_, i) => value(i));
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-36 items-end gap-1.5 sm:gap-2">
      {points.map((p, i) => {
        const v = values[i];
        const pct = Math.round((v / max) * 100);
        return (
          <div key={p.weekStart} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="truncate text-[10px] text-muted-foreground">{v > 0 ? format(v) : ""}</span>
            <div
              className={`w-full rounded-t-sm ${v > 0 ? barClass : "bg-muted"}`}
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`Week of ${shortDay(p.weekStart)}: ${format(v)}`}
            />
            <span className="truncate text-[10px] text-muted-foreground">{shortDay(p.weekStart)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const row = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, id),
    with: { user: true },
  });
  if (!row) notFound();

  const todayKey = new Date().toISOString().slice(0, 10);
  const [dash, sessions] = await Promise.all([
    getAffiliateDashboard(id, todayKey),
    getAffiliateLiveSessions(id, 200),
  ]);
  const { affiliate, totals, commissions, series, week } = dash;
  const name = row.user.name ?? row.user.email;
  const payoutSet = !!(affiliate.payoutMethod && affiliate.payoutHandle);
  const payoutLabel = payoutSet
    ? `${payoutMethodLabel(affiliate.payoutMethod)}: ${affiliate.payoutHandle}`
    : undefined;
  const pendingCount = commissions.filter((c) => c.status === "pending").length;
  const approvedCount = commissions.filter((c) => c.status === "approved").length;
  const hoursGoalMinutes = week.hoursGoal * 60;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/affiliates" className="text-sm text-muted-foreground hover:text-foreground">
          ← All affiliates
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-medium">{name}</h1>
          <AffiliateStatusBadge status={affiliate.status} />
        </div>
        {affiliate.username && <p className="text-sm text-muted-foreground">@{affiliate.username}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">{row.user.email}</Field>
              <Field label="Username">{affiliate.username ? `@${affiliate.username}` : "Not set"}</Field>
              <Field label="Code">
                <span className="font-mono text-brand-gold">{affiliate.code}</span>
              </Field>
              <Field label="Joined">{formatDate(affiliate.createdAt)}</Field>
              <Field label="Payout method">{payoutMethodLabel(affiliate.payoutMethod)}</Field>
              <Field label="Payout handle">
                {affiliate.payoutHandle ? (
                  <span className="font-mono">{affiliate.payoutHandle}</span>
                ) : (
                  <span className="text-destructive">Not set</span>
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This week (UTC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {dayLabel(week.start)} to {dayLabel(week.end)}
            </p>
            <div>
              <div className="flex justify-between text-sm">
                <span>LIVE time</span>
                <span>
                  {formatDuration(week.liveMinutes)} of {week.hoursGoal}h
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-brand-gold"
                  style={{
                    width: `${hoursGoalMinutes > 0 ? Math.min(100, Math.round((week.liveMinutes / hoursGoalMinutes) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Sessions</span>
                <span>
                  {week.liveSessions} of {week.sessionsGoal}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-brand-gold"
                  style={{
                    width: `${week.sessionsGoal > 0 ? Math.min(100, Math.round((week.liveSessions / week.sessionsGoal) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sales" value={`${totals.salesCount}`} tone="text-foreground" />
        <Stat label="Accounts" value={`${totals.accountsSold}`} tone="text-foreground" />
        <Stat label="Lifetime" value={formatMoney(totals.lifetimeCents)} />
        <Stat label="Pending" value={formatMoney(totals.pendingCents)} tone="text-brand-warning" />
        <Stat label="Approved" value={formatMoney(totals.approvedCents)} />
        <Stat label="Paid" value={formatMoney(totals.paidCents)} tone="text-brand-success" />
      </div>
      {totals.reversedCents > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          {formatMoney(totals.reversedCents)} reversed (not counted in lifetime).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission earned, last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekBars
              points={series}
              value={(i) => series[i].commissionCents}
              format={formatMoney}
              barClass="bg-brand-gold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>LIVE time, last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekBars
              points={series}
              value={(i) => series[i].liveMinutes}
              format={formatDuration}
              barClass="bg-brand-success"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusControls affiliateId={affiliate.id} status={affiliate.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly LIVE goals</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalsForm
              affiliateId={affiliate.id}
              hours={affiliate.weeklyLiveHoursGoal}
              sessions={affiliate.weeklyLiveSessionsGoal}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change code</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeForm affiliateId={affiliate.id} code={affiliate.code} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Commissions ({commissions.length})</CardTitle>
          <div className="flex flex-wrap gap-2">
            {pendingCount > 1 && (
              <ConfirmAction
                action={approveAllPendingCommissions.bind(null, affiliate.id)}
                question={`Approve all ${pendingCount} pending (${formatMoney(totals.pendingCents)})?`}
                confirmLabel="Approve all"
                successText="Pending commissions approved"
              >
                Approve all pending
              </ConfirmAction>
            )}
            {approvedCount > 1 && (
              <ConfirmAction
                action={markAffiliateCommissionsPaid.bind(null, affiliate.id)}
                question={`Sent ${formatMoney(totals.approvedCents)}${payoutLabel ? ` to ${payoutLabel}` : ""}?`}
                confirmLabel="Yes, mark all paid"
                successText="Approved commissions marked paid"
              >
                Mark all approved paid
              </ConfirmAction>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvedCount > 0 && (
            <p
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                payoutSet
                  ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {payoutSet
                ? `Pay ${formatMoney(totals.approvedCents)} to ${payoutLabel}`
                : `${formatMoney(totals.approvedCents)} approved, but no payout method is set. Ask them to add one in their settings.`}
            </p>
          )}
          {commissions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No commissions yet.</p>
          ) : (
            commissions.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-brand-gold">{formatMoney(c.amountCents)}</span>
                    <CommissionStatusBadge status={c.status} />
                    <Link
                      href={`/admin/orders/${c.orderCode}`}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      {c.orderCode}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.productName} x{c.quantity} · order {formatMoney(c.orderTotalCents)} · earned{" "}
                    {formatDate(c.createdAt)}
                    {c.approvedAt && <> · approved {formatDate(c.approvedAt)}</>}
                    {c.paidAt && <> · paid {formatDate(c.paidAt)}</>}
                    {c.reversedAt && <> · reversed {formatDate(c.reversedAt)}</>}
                  </p>
                  {c.status === "reversed" && c.reversalReason && (
                    <p className="text-xs text-destructive">Reason: {c.reversalReason}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <CommissionActions
                    id={c.id}
                    status={c.status}
                    amountLabel={formatMoney(c.amountCents)}
                    payoutLabel={payoutLabel}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LIVE sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No LIVE sessions reported yet.</p>
          ) : (
            sessions.map((s) => {
              const hasDetails = !!(s.commonQuestions || s.technicalIssues || s.notes);
              const summary = (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">{dayLabel(s.sessionDate)}</span>
                  <span className="text-muted-foreground">
                    {s.startTime} to {s.endTime}
                  </span>
                  <span className="text-brand-gold">{formatDuration(s.durationMinutes)}</span>
                  <span className="text-muted-foreground">
                    {s.incomingDms} DM{s.incomingDms === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground">
                    {s.qualifiedLeads} lead{s.qualifiedLeads === 1 ? "" : "s"}
                  </span>
                  {hasDetails && <span className="text-xs text-muted-foreground underline">Details</span>}
                </div>
              );
              if (!hasDetails) {
                return (
                  <div key={s.id} className="rounded-lg border border-border/60 px-3 py-2">
                    {summary}
                  </div>
                );
              }
              return (
                <details key={s.id} className="group rounded-lg border border-border/60 px-3 py-2">
                  <summary className="cursor-pointer list-none">{summary}</summary>
                  <dl className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
                    {s.commonQuestions && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">Common questions</dt>
                        <dd className="whitespace-pre-wrap">{s.commonQuestions}</dd>
                      </div>
                    )}
                    {s.technicalIssues && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">Technical issues</dt>
                        <dd className="whitespace-pre-wrap">{s.technicalIssues}</dd>
                      </div>
                    )}
                    {s.notes && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">Notes</dt>
                        <dd className="whitespace-pre-wrap">{s.notes}</dd>
                      </div>
                    )}
                  </dl>
                </details>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
