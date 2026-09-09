import { auth } from "@/lib/auth";
import {
  commissionSummary,
  paidTimeline,
  railMix,
  recentSales,
  revenueSummary,
  sourceMix,
  topCustomers,
} from "@/lib/db/queries/reporting";
import { formatDate, formatMoney } from "@/lib/format";
import {
  parseMetricsRange,
  rangeLabel,
  type MetricsRange,
} from "@/lib/admin/metrics-range";
import { MetricsRangePicker } from "@/components/admin/metrics-range-picker";
import { CountUp } from "@/components/admin/overview/count-up";
import { Milestones } from "@/components/admin/overview/milestones";
import { RecentSales } from "@/components/admin/overview/recent-sales";
import { RevenueChart } from "@/components/admin/overview/revenue-chart";
import { SaleCelebrator } from "@/components/admin/overview/sale-celebrator";
import { TodayHero } from "@/components/admin/overview/today-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Stat({ label, cents, hint }: { label: string; cents: number; hint?: string }) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:ring-brand-gold/40 hover:shadow-[0_0_40px_-14px_var(--brand-gold)]">
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl text-brand-gold">
          <CountUp value={cents} />
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Prefer the YYYY-MM-DD the owner picked over the timestamp: the timestamp
 * is their local midnight, which the server (UTC) could format as the
 * previous day.
 */
function formatDay(day: string | undefined, fallback: Date | undefined): string {
  if (day) {
    const [y, m, d] = day.split("-").map(Number);
    return formatDate(new Date(y, m - 1, d));
  }
  return fallback ? formatDate(fallback) : "";
}

function describeRange(range: MetricsRange): string {
  if (range.preset === "all") return "Every paid order since launch.";
  if (range.preset === "custom") {
    // `to` is exclusive (midnight after the chosen end day), so step back
    // to show the day the owner actually picked.
    const endDay = range.to ? new Date(range.to.getTime() - 1) : undefined;
    const start = formatDay(range.fromDay, range.from);
    const end = formatDay(range.toDay, endDay);
    if (start && end) return `Paid orders from ${start} to ${end}.`;
    if (start) return `Paid orders since ${start}.`;
    if (end) return `Paid orders up to ${end}.`;
  }
  return `Paid orders in the ${rangeLabel(range)}.`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseMetricsRange(await searchParams);
  const label = rangeLabel(range);

  const [allTime, period, rails, sources, customers, comms, timeline, latest, session] =
    await Promise.all([
      revenueSummary(),
      revenueSummary({ from: range.from, to: range.to }),
      railMix(),
      sourceMix(),
      topCustomers(8),
      commissionSummary(),
      paidTimeline(),
      recentSales(8),
      auth(),
    ]);

  const totalRailRevenue = rails.reduce((s, r) => s + Number(r.revenueCents), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, profit, and where the volume comes from.
          </p>
        </div>
        <SaleCelebrator />
      </div>

      <TodayHero points={timeline} ownerName={session?.user?.name} />

      <div className="space-y-3">
        <MetricsRangePicker
          preset={range.preset}
          fromDay={range.fromDay}
          toDay={range.toDay}
        />
        <p className="text-xs text-muted-foreground">{describeRange(range)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Revenue (${label})`}
          cents={period.revenueCents}
          hint={`${period.orderCount} orders · ${period.accountsSold} accounts`}
        />
        <Stat
          label={`Profit (${label})`}
          cents={period.marginCents}
          hint={`cost ${formatMoney(period.costCents)}`}
        />
        <Stat
          label="Revenue (all time)"
          cents={allTime.revenueCents}
          hint={`${allTime.accountsSold} accounts sold`}
        />
        <Stat
          label="Profit (all time)"
          cents={allTime.marginCents}
          hint={`cost ${formatMoney(allTime.costCents)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart points={timeline} />
        <RecentSales sales={latest} />
      </div>

      <Milestones
        revenueCents={allTime.revenueCents}
        accountsSold={allTime.accountsSold}
      />

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
                      className="h-1.5 rounded-full bg-brand-gold"
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
              {customers.map((c) => (
                <TableRow key={c.userId}>
                  <TableCell>
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
