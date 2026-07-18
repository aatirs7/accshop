import {
  commissionSummary,
  railMix,
  revenueSummary,
  sourceMix,
  topCustomers,
} from "@/lib/db/queries/reporting";
import { formatMoney } from "@/lib/format";
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

export default async function AdminOverviewPage() {
  const [allTime, last30, rails, sources, customers, comms] = await Promise.all([
    revenueSummary(),
    revenueSummary(30),
    railMix(),
    sourceMix(),
    topCustomers(8),
    commissionSummary(),
  ]);

  const totalRailRevenue = rails.reduce((s, r) => s + Number(r.revenueCents), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, margin, and where the volume comes from.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue (30d)"
          value={formatMoney(last30.revenueCents)}
          hint={`${last30.orderCount} orders · ${last30.accountsSold} accounts`}
        />
        <Stat
          label="Margin (30d)"
          value={formatMoney(last30.marginCents)}
          hint={`cost ${formatMoney(last30.costCents)}`}
        />
        <Stat
          label="Revenue (all time)"
          value={formatMoney(allTime.revenueCents)}
          hint={`${allTime.accountsSold} accounts sold`}
        />
        <Stat
          label="Margin (all time)"
          value={formatMoney(allTime.marginCents)}
          hint={`cost ${formatMoney(allTime.costCents)}`}
        />
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
