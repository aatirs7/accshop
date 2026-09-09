import { Crown, Flame, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import {
  bestDay,
  commissionSummary,
  dailyRevenue,
  railMix,
  recentSales,
  revenueSummary,
  sourceMix,
  todayKey,
  todaySummary,
  topCustomers,
  REPORTING_TZ,
} from "@/lib/db/queries/reporting";
import { formatMoney } from "@/lib/format";
import { CountUp } from "@/components/admin/count-up";
import { LiveSalesFeed } from "@/components/admin/live-sales-feed";
import { RevenueBars, type DayBar } from "@/components/admin/revenue-bars";
import { SaleCelebration } from "@/components/admin/sale-celebration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function Stat({
  label,
  cents,
  hint,
}: {
  label: string;
  cents: number;
  hint?: string;
}) {
  return (
    <Card className="stat-glow">
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl text-brand-gold">
          <CountUp value={cents} money />
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// Revenue milestones the progress bar climbs toward. Past $1M it keeps
// going in $1M steps so the bar never runs out of road.
const MILESTONES_CENTS = [
  100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000,
  25_000_000, 50_000_000, 100_000_000,
];

function nextMilestone(revenueCents: number) {
  const next =
    MILESTONES_CENTS.find((m) => m > revenueCents) ??
    (Math.floor(revenueCents / 100_000_000) + 1) * 100_000_000;
  const idx = MILESTONES_CENTS.indexOf(next);
  const prev = idx > 0 ? MILESTONES_CENTS[idx - 1] : idx === 0 ? 0 : next - 100_000_000;
  const pct = Math.min(100, Math.max(0, ((revenueCents - prev) / (next - prev)) * 100));
  return { next, prev, pct, remaining: next - revenueCents };
}

/** Consecutive days with at least one sale, counting back from today (or yesterday if today is still quiet). */
function saleStreak(days: DayBar[]): number {
  let streak = 0;
  let i = days.length - 1;
  if (days[i]?.revenueCents === 0) i--; // today hasn't had a sale yet, don't break the streak
  for (; i >= 0; i--) {
    if (days[i].revenueCents > 0) streak++;
    else break;
  }
  return streak;
}

function lastNDays(n: number, rows: Awaited<ReturnType<typeof dailyRevenue>>): DayBar[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = todayKey();
  const out: DayBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000);
    const key = todayKey(date);
    const row = byDay.get(key);
    out.push({
      day: key,
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: REPORTING_TZ,
        month: "short",
        day: "numeric",
      }).format(date),
      revenueCents: row?.revenueCents ?? 0,
      orderCount: row?.orderCount ?? 0,
      isToday: key === today,
    });
  }
  return out;
}

export default async function AdminOverviewPage() {
  const [allTime, last30, today, rails, sources, customers, comms, daily, best, sales] =
    await Promise.all([
      revenueSummary(),
      revenueSummary(30),
      todaySummary(),
      railMix(),
      sourceMix(),
      topCustomers(8),
      commissionSummary(),
      dailyRevenue(30),
      bestDay(),
      recentSales(8),
    ]);

  const totalRailRevenue = rails.reduce((s, r) => s + Number(r.revenueCents), 0);
  const days30 = lastNDays(30, daily);
  const days14 = days30.slice(-14);
  const streak = saleStreak(days30);
  const milestone = nextMilestone(allTime.revenueCents);
  const isRecordDay =
    today.revenueCents > 0 && best !== null && today.revenueCents >= best.revenueCents;
  const lastSale = sales[0];
  const avgOrder = allTime.orderCount
    ? Math.round(allTime.revenueCents / allTime.orderCount)
    : 0;
  const feed = sales.map((s) => ({ ...s, paidAt: s.paidAt.toISOString() }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, margin, and where the volume comes from. Live: new sales
            ring the bell while this page is open.
          </p>
        </div>
        <SaleCelebration knownIds={sales.map((s) => s.id)} />
      </div>

      {/* Hero: today */}
      <Card className="hero-glow relative overflow-hidden ring-brand-gold/30">
        <div className="gold-hairline absolute inset-x-0 top-0" />
        <CardContent className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Today so far
                </p>
                {isRecordDay && (
                  <Badge className="gap-1 bg-brand-gold text-primary-foreground">
                    <Trophy /> New record day
                  </Badge>
                )}
                {!isRecordDay && today.orderCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-brand-success/50 text-brand-success">
                    <TrendingUp /> Money in
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-display text-5xl leading-none text-brand-gold sm:text-6xl">
                <CountUp value={today.revenueCents} money duration={1800} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {today.orderCount === 0
                  ? "No sales yet today. Next one rings the bell."
                  : `${today.orderCount} ${today.orderCount === 1 ? "order" : "orders"} · ${today.accountsSold} ${today.accountsSold === 1 ? "account" : "accounts"} · ${formatMoney(today.marginCents)} margin`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 self-center">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame
                    className={`size-3.5 ${streak > 0 ? "animate-flame text-brand-warning" : ""}`}
                  />
                  Sale streak
                </p>
                <p className="mt-1 font-display text-2xl">
                  <CountUp value={streak} />{" "}
                  <span className="text-sm text-muted-foreground">
                    {streak === 1 ? "day" : "days"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="size-3.5 text-brand-gold" />
                  Best day ever
                </p>
                <p className="mt-1 font-display text-2xl">
                  {best ? formatMoney(best.revenueCents) : "—"}
                </p>
                {best && (
                  <p className="text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${best.day}T00:00:00Z`))}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-brand-gold" />
                  Average order
                </p>
                <p className="mt-1 font-display text-2xl">
                  <CountUp value={avgOrder} money />
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="size-3.5 text-brand-gold" />
                  Last sale
                </p>
                <p className="mt-1 font-display text-2xl">
                  {lastSale ? formatMoney(lastSale.totalCents) : "—"}
                </p>
                {lastSale && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {lastSale.customerName ?? lastSale.customerEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Milestone road */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                Next milestone:{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(milestone.next)}
                </span>{" "}
                all-time
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-brand-gold">
                  {formatMoney(milestone.remaining)}
                </span>{" "}
                to go · {Math.round(milestone.pct)}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-border">
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-brand-gold-dim to-brand-gold transition-[width] duration-1000"
                style={{ width: `${Math.max(milestone.pct, 1.5)}%` }}
              >
                <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{formatMoney(milestone.prev)}</span>
              <span>{formatMoney(milestone.next)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue (30d)"
          cents={last30.revenueCents}
          hint={`${last30.orderCount} orders · ${last30.accountsSold} accounts`}
        />
        <Stat
          label="Margin (30d)"
          cents={last30.marginCents}
          hint={`cost ${formatMoney(last30.costCents)}`}
        />
        <Stat
          label="Revenue (all time)"
          cents={allTime.revenueCents}
          hint={`${allTime.accountsSold} accounts sold`}
        />
        <Stat
          label="Margin (all time)"
          cents={allTime.marginCents}
          hint={`cost ${formatMoney(allTime.costCents)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBars days={days14} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-success" />
              </span>
              Live sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveSalesFeed sales={feed} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Payment rail mix
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (watch processor concentration)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rails.length === 0 && (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            )}
            {rails.map((r) => {
              const pct = totalRailRevenue
                ? Math.round((Number(r.revenueCents) / totalRailRevenue) * 100)
                : 0;
              return (
                <div key={r.method}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{r.method}</span>
                    <span>
                      {formatMoney(Number(r.revenueCents))} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border">
                    <div
                      className="h-1.5 rounded-full bg-brand-gold transition-[width] duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volume by source</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="capitalize">{s.source}</TableCell>
                    <TableCell className="text-right">
                      {Number(s.accountsSold)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(Number(s.revenueCents))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-4 text-xs text-muted-foreground">
              Referral commissions, accrued:{" "}
              <strong>{formatMoney(comms.accruedCents)}</strong> · paid out:{" "}
              {formatMoney(comms.paidCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top customers by lifetime value</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">LTV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, i) => (
                <TableRow key={c.userId}>
                  <TableCell>
                    {i === 0 && (
                      <Crown className="mr-1.5 inline size-3.5 text-brand-gold" />
                    )}
                    <span className="font-medium">{c.name ?? c.email}</span>
                    {c.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{c.role}</TableCell>
                  <TableCell className="text-right">{Number(c.orderCount)}</TableCell>
                  <TableCell className="text-right">
                    {Number(c.accountsBought)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-brand-gold">
                    {formatMoney(Number(c.ltvCents))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
