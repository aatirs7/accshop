import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users, warrantyClaims } from "@/lib/db/schema";
import { customerLtv } from "@/lib/db/queries/reporting";
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

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { partner: true },
  });
  if (!user) notFound();

  const [ltv, userOrders, claims] = await Promise.all([
    customerLtv(id),
    db.query.orders.findMany({
      where: eq(orders.userId, id),
      with: { product: true },
      orderBy: desc(orders.createdAt),
    }),
    db.query.warrantyClaims.findMany({
      where: eq(warrantyClaims.userId, id),
      orderBy: desc(warrantyClaims.createdAt),
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All customers
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-medium">
            {user.name ?? user.email}
          </h1>
          <Badge variant="outline" className="capitalize">
            {user.role}
          </Badge>
          {user.partner && (
            <Link
              href={`/admin/partners/${user.partner.id}`}
              className="text-sm text-brand-gold underline"
            >
              Partner profile →
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email} · joined {formatDate(user.createdAt)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Lifetime value
            </p>
            <p className="mt-1 font-display text-2xl text-brand-gold">
              {formatMoney(ltv.ltvCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Paid orders
            </p>
            <p className="mt-1 font-display text-2xl">{ltv.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Accounts bought
            </p>
            <p className="mt-1 font-display text-2xl">{ltv.accountsBought}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${o.orderCode}`}
                      className="font-mono text-brand-gold hover:underline"
                    >
                      {o.orderCode}
                    </Link>
                  </TableCell>
                  <TableCell>
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

      {claims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warranty claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {claims.map((c) => (
              <div key={c.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex justify-between">
                  <Badge variant="outline" className="capitalize">
                    {c.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">{c.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
