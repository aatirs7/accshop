import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountStock, deliverables, suppliers } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { SupplierForm, SupplierRow } from "@/components/admin/queue-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default async function AdminSuppliersPage() {
  const [supplierRows, stats, stockStats] = await Promise.all([
    db.query.suppliers.findMany({ orderBy: asc(suppliers.name) }),
    db
      .select({
        supplierId: deliverables.supplierId,
        fulfilled: sql<number>`count(*)`,
        totalCostCents: sql<number>`coalesce(sum(${deliverables.costCents}), 0)`,
        avgCostCents: sql<number>`coalesce(avg(${deliverables.costCents}), 0)`,
      })
      .from(deliverables)
      .where(sql`${deliverables.supplierId} is not null`)
      .groupBy(deliverables.supplierId),
    db
      .select({
        supplierId: accountStock.supplierId,
        count: sql<number>`count(*)`,
      })
      .from(accountStock)
      .groupBy(accountStock.supplierId),
  ]);
  const bySupplier = new Map(stats.map((s) => [s.supplierId, s]));
  const stockBySupplier = new Map(
    stockStats.map((s) => [s.supplierId, Number(s.count)]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who fulfilled what, at what cost. Share a supplier&apos;s submit
            link so they can drop off accounts, then pull them from{" "}
            <Link href="/admin/stock" className="underline">
              Account stock
            </Link>
            .
          </p>
        </div>
        <SupplierForm />
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Accounts fulfilled</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Total paid</TableHead>
                <TableHead className="text-right">Accounts waiting</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierRows.map((s) => {
                const st = bySupplier.get(s.id);
                const fulfilled = st ? Number(st.fulfilled) : 0;
                const avgCostLabel =
                  st && fulfilled > 0
                    ? formatMoney(Math.round(Number(st.avgCostCents)))
                    : s.defaultCostCents
                      ? `${formatMoney(s.defaultCostCents)} (default)`
                      : "-";
                const totalPaidLabel = st
                  ? formatMoney(Number(st.totalCostCents))
                  : "-";
                return (
                  <SupplierRow
                    key={s.id}
                    supplier={s}
                    fulfilled={fulfilled}
                    avgCostLabel={avgCostLabel}
                    totalPaidLabel={totalPaidLabel}
                    appUrl={env.APP_URL}
                    stockCount={stockBySupplier.get(s.id) ?? 0}
                  />
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
