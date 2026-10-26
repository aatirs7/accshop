import Link from "next/link";
import { BadgeCheck, Hourglass, Radio, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { requireAffiliate, canEarn } from "@/lib/affiliates/auth";
import { getAffiliateDashboard } from "@/lib/affiliates/stats";
import { AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS } from "@/lib/affiliates/constants";
import { formatDuration } from "@/lib/affiliates/live";
import { formatMoney } from "@/lib/format";
import { env } from "@/lib/env";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/dashboard/copy-field";
import { CountUpMoney } from "@/components/affiliates/dashboard/count-up";
import { StatCard } from "@/components/affiliates/dashboard/stat-card";
import { WeeklyGoals } from "@/components/affiliates/dashboard/weekly-goals";
import { BarChart } from "@/components/affiliates/dashboard/bar-chart";
import { SaleCelebration } from "@/components/affiliates/dashboard/sale-celebration";
import { CommissionHistory } from "@/components/affiliates/dashboard/commission-history";
import { GoalBar } from "@/components/affiliates/dashboard/goal-bar";
import { shortDay } from "@/components/affiliates/dashboard/format-day";
import { LocalDaySync } from "@/components/affiliates/live/local-day-sync";
import { getViewerToday } from "@/components/affiliates/live/viewer-today";

export const metadata = { title: "Affiliate dashboard" };
// Depends on the signed-in affiliate and the viewer's local day.
export const dynamic = "force-dynamic";

/** Sales milestones that drive the "next milestone" meter. */
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

function milestoneFor(sales: number) {
  const next = MILESTONES.find((m) => m > sales) ?? Math.ceil((sales + 1) / 1000) * 1000;
  const prevIdx = MILESTONES.findIndex((m) => m === next) - 1;
  const prev = prevIdx >= 0 ? MILESTONES[prevIdx] : next >= 1000 ? next - 1000 : 0;
  const percent = next === prev ? 100 : ((sales - prev) / (next - prev)) * 100;
  return { next, percent };
}

export default async function AffiliateDashboardPage() {
  const { affiliate } = await requireAffiliate();
  const today = await getViewerToday();
  const { totals, commissions, series, week } = await getAffiliateDashboard(affiliate.id, today, 8);
  const earning = canEarn(affiliate);
  const shareLink = `${env.APP_URL}/accounts?code=${affiliate.code}`;
  const milestone = milestoneFor(totals.salesCount);
  const salesToGo = milestone.next - totals.salesCount;

  const commissionPoints = series.map((w) => ({
    label: shortDay(w.weekStart),
    value: w.commissionCents,
    display: formatMoney(w.commissionCents),
    description: `Week of ${shortDay(w.weekStart)}: ${formatMoney(w.commissionCents)} earned`,
  }));
  const livePoints = series.map((w) => ({
    label: shortDay(w.weekStart),
    value: w.liveMinutes,
    display: formatDuration(w.liveMinutes),
    description: `Week of ${shortDay(w.weekStart)}: ${formatDuration(w.liveMinutes)} LIVE across ${w.liveSessions} ${
      w.liveSessions === 1 ? "session" : "sessions"
    }`,
  }));
  const eightWeekCents = series.reduce((s, w) => s + w.commissionCents, 0);
  const eightWeekMinutes = series.reduce((s, w) => s + w.liveMinutes, 0);

  return (
    <div className="space-y-8">
      <LocalDaySync serverToday={today} />
      <SaleCelebration
        affiliateId={affiliate.id}
        salesCount={totals.salesCount}
        lifetimeCents={totals.lifetimeCents}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-gold/20 bg-card bg-atmosphere px-5 py-10 text-center sm:py-14">
        <div className="gold-hairline absolute inset-x-0 top-0" aria-hidden="true" />
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Sparkles className="size-3.5 text-brand-gold" aria-hidden="true" />
          Lifetime commission
        </p>
        <h1 className="mt-3 font-display text-6xl font-semibold text-brand-gold drop-shadow-sm sm:text-7xl md:text-8xl">
          <CountUpMoney cents={totals.lifetimeCents} />
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Paid out so far{" "}
          <span className="font-medium text-brand-success tabular-nums">{formatMoney(totals.paidCents)}</span>
        </p>

        <div className="mx-auto mt-8 max-w-sm space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-medium">
              {milestone.next} {milestone.next === 1 ? "sale" : "sales"}
            </span>
          </div>
          <GoalBar
            percent={milestone.percent}
            hit={false}
            label={`${totals.salesCount} of ${milestone.next} sales toward your next milestone`}
          />
          <p className="text-center text-xs text-muted-foreground">
            {totals.salesCount === 0
              ? `Your first sale earns ${formatMoney(AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS)}.`
              : `${salesToGo} more ${salesToGo === 1 ? "sale" : "sales"} to unlock it. ${formatMoney(
                  AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS,
                )} per account sold.`}
          </p>
        </div>
        {!earning && (
          <p className="mt-6 text-xs text-muted-foreground">
            New sales won&apos;t earn commission while your account is {affiliate.status}.
          </p>
        )}
      </section>

      {/* Stats */}
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<ShoppingBag className="size-4" aria-hidden="true" />}
          label="Sales"
          value={String(totals.salesCount)}
          hint={`${totals.accountsSold} ${totals.accountsSold === 1 ? "account" : "accounts"} sold`}
        />
        <StatCard
          icon={<Hourglass className="size-4" aria-hidden="true" />}
          label="Pending"
          value={formatMoney(totals.pendingCents)}
          hint="Being reviewed"
          tone="warning"
        />
        <StatCard
          icon={<BadgeCheck className="size-4" aria-hidden="true" />}
          label="Approved"
          value={formatMoney(totals.approvedCents)}
          hint="Awaiting payout"
        />
        <StatCard
          icon={<Wallet className="size-4" aria-hidden="true" />}
          label="Paid"
          value={formatMoney(totals.paidCents)}
          hint="Sent to you"
          tone="success"
        />
      </section>

      {/* Link + goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-brand-gold/10 via-card to-card">
          <CardContent className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-medium">Your link</h2>
              <p className="text-xs text-muted-foreground">
                {earning
                  ? `Anyone who buys through it earns you ${formatMoney(AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS)} per account.`
                  : "Your link still works for buyers, but it isn't earning right now."}
              </p>
            </div>
            <CopyField label="Your code" value={affiliate.code} />
            <CopyField label="Share link" value={shareLink} />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <WeeklyGoals week={week} />
          <div className="text-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/affiliates/live">
                <Radio className="size-3.5" aria-hidden="true" />
                Report a LIVE
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <section aria-label="Last 8 weeks" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-medium">Commission earned</h2>
              <p className="text-xs text-muted-foreground">
                {formatMoney(eightWeekCents)} in 8 weeks
              </p>
            </div>
            <BarChart
              title="Commission earned per week"
              description="Commission earned in each of the last 8 weeks, oldest first."
              points={commissionPoints}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-medium">LIVE hours</h2>
              <p className="text-xs text-muted-foreground">
                {formatDuration(eightWeekMinutes)} in 8 weeks
              </p>
            </div>
            <BarChart
              title="LIVE time per week"
              description="Time spent LIVE in each of the last 8 weeks, oldest first."
              points={livePoints}
              tone="success"
            />
          </CardContent>
        </Card>
      </section>

      <CommissionHistory commissions={commissions} canEarn={earning} />
    </div>
  );
}
