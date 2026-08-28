import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockAccounts } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { StockAccountRow } from "@/components/admin/queue-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminInventoryPage() {
  const [productList, stockRows] = await Promise.all([
    db.query.products.findMany({ orderBy: asc(products.sort) }),
    db.query.stockAccounts.findMany({
      orderBy: desc(stockAccounts.createdAt),
      with: { supplier: true, product: true },
    }),
  ]);

  const availableByProduct = new Map<string, number>();
  for (const row of stockRows) {
    if (row.used) continue;
    availableByProduct.set(row.productId, (availableByProduct.get(row.productId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accounts suppliers have loaded in, waiting to be handed to a buyer.
          Give a supplier their link from the Suppliers page to add more.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {productList.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 p-4">
                <p className="text-sm text-muted-foreground">{p.name}</p>
                <p className="mt-1 font-display text-2xl">
                  {availableByProduct.get(p.id) ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">ready in stock</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account type</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Login hint</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockRows.map((row) => (
                <StockAccountRow
                  key={row.id}
                  id={row.id}
                  productName={row.product.name}
                  supplierName={row.supplier.name}
                  fingerprint={row.fingerprint}
                  addedLabel={formatDate(row.createdAt)}
                  used={row.used}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
