import {
  bulkSalesSummary,
  commissionSummary,
  railMix,
  recentBulkSales,
  revenueSummary,
  sourceMix,
  topCustomers,
} from "@/lib/db/queries/reporting";
import { deleteBulkSale } from "@/actions/admin/bulk-sales";
import { formatDate, formatMoney } from "@/lib/format";
import {
  parseMetricsRange,
  rangeLabel,
  type MetricsRange,
} from "@/lib/admin/metrics-range";
import { MetricsRangePicker } from "@/components/admin/metrics-range-picker";
import { ActionButton } from "@/components/admin/action-button";
import { BulkSaleForm } from "@/components/admin/bulk-sale-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl text-brand-gold">{value}</p>
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
  if (range.preset === "all") return "Every paid order and bulk order since launch.";
  if (range.preset === "custom") {
    // `to` is exclusive (midnight after the chosen end day), so step back
    // to show the day the owner actually picked.
    const endDay = range.to ? new Date(range.to.getTime() - 1) : undefined;
    const start = formatDay(range.fromDay, range.from);
    const end = formatDay(range.toDay, endDay);
    if (start && end) return `Paid orders and bulk orders from ${start} to ${end}.`;
    if (start) return `Paid orders and bulk orders since ${start}.`;
    if (end) return `Paid orders and bulk orders up to ${end}.`;
  }
  return `Paid orders and bulk orders in the ${rangeLabel(range)}.`;
}

/** "$1,200 site · $800 bulk" style breakdown under a combined stat. */
function splitHint(siteCents: number, bulkCents: number): string {
  return `${formatMoney(siteCents)} site · ${formatMoney(bulkCents)} bulk`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseMetricsRange(await searchParams);
  const label = rangeLabel(range);

  const [
    allTime,
    period,
    bulkAllTime,
    bulkPeriod,
    bulkEntries,
    rails,
    sources,
    customers,
    comms,
  ] = await Promise.all([
    revenueSummary(),
    revenueSummary({ from: range.from, to: range.to }),
    bulkSalesSummary(),
    bulkSalesSummary({ from: range.from, to: range.to }),
    recentBulkSales(20),
    railMix(),
    sourceMix(),
    topCustomers(8),
    commissionSummary(),
  ]);

  const totalRailRevenue = rails.reduce((s, r) => s + Number(r.revenueCents), 0);

  // Headline numbers combine site checkout with hand-entered bulk orders.
  const periodRevenue = period.revenueCents + bulkPeriod.revenueCents;
  const periodProfit = period.marginCents + bulkPeriod.profitCents;
  const allRevenue = allTime.revenueCents + bulkAllTime.revenueCents;
  const allProfit = allTime.marginCents + bulkAllTime.profitCents;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, profit, and where the volume comes from.
        </p>
      </div>

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
          value={formatMoney(periodRevenue)}
          hint={`${period.orderCount} orders · ${bulkPeriod.saleCount} bulk · ${
            period.accountsSold + bulkPeriod.accountsSold
          } accounts`}
        />
        <Stat
          label={`Profit (${label})`}
          value={formatMoney(periodProfit)}
          hint={splitHint(period.marginCents, bulkPeriod.profitCents)}
        />
        <Stat
          label="Revenue (all time)"
          value={formatMoney(allRevenue)}
          hint={`${allTime.accountsSold + bulkAllTime.accountsSold} accounts sold · ${splitHint(
            allTime.revenueCents,
            bulkAllTime.revenueCents,
          )}`}
        />
        <Stat
          label="Profit (all time)"
          value={formatMoney(allProfit)}
          hint={splitHint(allTime.marginCents, bulkAllTime.profitCents)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bulk orders to coaches
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (supplied outside the site, entered by hand)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BulkSaleForm />

          {bulkEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bulk orders logged yet. Add one above and it will count toward
              the revenue and profit numbers at the top.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkEntries.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(b.soldAt)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{b.coachName}</span>
                      {b.notes && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {b.notes}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{b.accounts}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(b.revenueCents)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-brand-gold">
                      {formatMoney(b.profitCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        action={deleteBulkSale.bind(null, b.id)}
                        variant="ghost"
                        confirmText={`Remove the bulk order for ${b.coachName}? The revenue and profit will come off the totals.`}
                        successText="Bulk order removed"
                      >
                        Remove
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
