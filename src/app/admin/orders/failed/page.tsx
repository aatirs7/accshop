import Link from "next/link";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { pipelineStage } from "@/lib/orders/status";
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

export default async function AdminFailedOrdersPage() {
  // Checkout rows are created the moment someone starts paying, before
  // Stripe confirms anything, so this is whoever never finished paying.
  const failedOrders = await db.query.orders.findMany({
    where: or(
      eq(orders.paymentStatus, "cancelled"),
      and(eq(orders.paymentStatus, "pending"), eq(orders.paymentMethod, "stripe")),
    ),
    with: { user: true, product: true },
    orderBy: desc(orders.createdAt),
    limit: 200,
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Orders
        </Link>
        <h1 className="mt-3 font-display text-3xl font-medium">
          Failed / incomplete checkouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Started checkout but never paid, or the card payment didn&apos;t go
          through. No money was collected on these.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All ({failedOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here — every checkout has either paid or is still in
              progress.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Attempted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${o.orderCode}`}
                        className="font-mono text-brand-gold hover:underline"
                      >
                        {o.orderCode}
                      </Link>
                    </TableCell>
                    <TableCell>{o.user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.quantity}× {o.product.tierLabel}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(o.totalCents)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pipelineStage(o).label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
