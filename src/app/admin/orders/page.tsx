import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { pipelineStage } from "@/lib/orders/status";
import { markZellePaid, resendZelleInstructions } from "@/actions/admin/orders";
import { ActionButton, PromptActionButton } from "@/components/admin/action-button";
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

export default async function AdminOrdersPage() {
  const [zelleQueue, allOrders] = await Promise.all([
    db.query.orders.findMany({
      where: and(
        eq(orders.paymentMethod, "zelle"),
        eq(orders.paymentStatus, "pending"),
      ),
      with: { user: true, product: true },
      orderBy: desc(orders.createdAt),
    }),
    db.query.orders.findMany({
      with: { user: true, product: true },
      orderBy: desc(orders.createdAt),
      limit: 100,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm Zelle payments, advance fulfillment, deliver credentials.
        </p>
      </div>

      {zelleQueue.length > 0 && (
        <Card className="border-brand-warning/40">
          <CardHeader>
            <CardTitle className="text-base text-brand-warning">
              Zelle, awaiting payment ({zelleQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code (memo)</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zelleQueue.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-brand-gold">
                      {o.orderCode}
                    </TableCell>
                    <TableCell>{o.user.email}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(o.totalCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <PromptActionButton
                        action={markZellePaid.bind(null, o.id)}
                        promptText={`Zelle reference / confirmation number for ${o.orderCode} (${formatMoney(o.totalCents)}):`}
                        variant="default"
                        successText="Marked paid, fulfillment started"
                        allowEmpty
                      >
                        Mark paid
                      </PromptActionButton>
                      <ActionButton
                        action={resendZelleInstructions.bind(null, o.id)}
                        successText="Instructions re-sent"
                      >
                        Re-send
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((o) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
