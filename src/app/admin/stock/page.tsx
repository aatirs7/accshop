import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountStock } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { AccountStockRow } from "@/components/admin/stock-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminStockPage() {
  const stock = await db.query.accountStock.findMany({
    orderBy: desc(accountStock.createdAt),
    with: { supplier: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Account stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accounts suppliers have handed over, waiting to be used for a paid
          order. Reveal to copy the details, then delete once delivered.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {stock.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accounts in stock yet. Share a supplier&apos;s submit link
              from the Suppliers page to start collecting some.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Account details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s) => (
                  <AccountStockRow
                    key={s.id}
                    stockId={s.id}
                    supplierName={s.supplier.name}
                    fingerprint={s.fingerprint}
                    addedLabel={formatDate(s.createdAt)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
