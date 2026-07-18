import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables, suppliers } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { toggleSupplierActive } from "@/actions/admin/catalog";
import { ActionButton } from "@/components/admin/action-button";
import { SupplierForm } from "@/components/admin/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminSuppliersPage() {
  const [supplierRows, stats] = await Promise.all([
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
  ]);
  const bySupplier = new Map(stats.map((s) => [s.supplierId, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who fulfilled what, at what cost.
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierRows.map((s) => {
                const st = bySupplier.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.contactHandle ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {st ? Number(st.fulfilled) : 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {st && Number(st.fulfilled) > 0
                        ? formatMoney(Math.round(Number(st.avgCostCents)))
                        : s.defaultCostCents
                          ? `${formatMoney(s.defaultCostCents)} (default)`
                          : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {st ? formatMoney(Number(st.totalCostCents)) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {s.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        action={toggleSupplierActive.bind(null, s.id, !s.active)}
                        successText={s.active ? "Deactivated" : "Activated"}
                      >
                        {s.active ? "Deactivate" : "Activate"}
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
