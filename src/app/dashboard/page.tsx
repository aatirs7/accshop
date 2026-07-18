import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge, WarrantyBadge } from "@/components/dashboard/status-badges";

export default async function DashboardPage() {
  const user = await requireUser();
  const myOrders = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    with: { product: true },
    orderBy: desc(orders.createdAt),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-medium">My orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track fulfillment, reveal credentials, and manage warranties.
      </p>

      {myOrders.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="py-16 text-center">
            <p className="font-display text-xl">No orders yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your orders will appear here the moment you check out.
            </p>
            <Button asChild className="mt-6">
              <Link href="/accounts">Browse accounts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {myOrders.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.orderCode}`}
              className="block rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-brand-gold/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm tracking-[0.1em] text-brand-gold">
                    {o.orderCode}
                  </p>
                  <p className="mt-1 font-medium">
                    {o.quantity}× {o.product.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ordered {formatDate(o.createdAt)} ·{" "}
                    {formatMoney(o.totalCents)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StageBadge order={o} />
                  {o.fulfillmentStatus === "delivered" && (
                    <WarrantyBadge deliveredAt={o.deliveredAt} />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
