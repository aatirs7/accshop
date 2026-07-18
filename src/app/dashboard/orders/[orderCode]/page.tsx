import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables as deliverablesTable, orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { formatDate, formatMoney } from "@/lib/format";
import { pipelineStage } from "@/lib/orders/status";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge, WarrantyBadge } from "@/components/dashboard/status-badges";
import { RevealPanel } from "@/components/dashboard/reveal-panel";

const PIPELINE_STEPS = [
  { key: "awaiting_payment", label: "Payment" },
  { key: "sourcing", label: "Sourcing" },
  { key: "credentials_ready", label: "Credentials ready" },
  { key: "warranty", label: "Delivered + warranty" },
] as const;

function stepIndex(stageKey: string): number {
  switch (stageKey) {
    case "awaiting_payment":
      return 0;
    case "sourcing":
      return 1;
    case "credentials_ready":
      return 2;
    default:
      return 3;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const user = await requireUser();
  const { orderCode } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderCode, orderCode.toUpperCase()),
    with: { product: true },
  });
  if (!order || order.userId !== user.id) notFound();

  const items = await db.query.deliverables.findMany({
    where: eq(deliverablesTable.orderId, order.id),
    with: { credential: true },
    orderBy: asc(deliverablesTable.createdAt),
  });

  const stage = pipelineStage(order);
  const active = stepIndex(stage.key);
  const cancelled = stage.key === "cancelled" || stage.key === "refunded";

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm tracking-[0.1em] text-brand-gold">
            {order.orderCode}
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">
            {order.quantity}× {order.product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordered {formatDate(order.createdAt)} · {formatMoney(order.totalCents)}{" "}
            via {order.paymentMethod === "zelle" ? "Zelle" : "card"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StageBadge order={order} />
          {order.fulfillmentStatus === "delivered" && (
            <WarrantyBadge deliveredAt={order.deliveredAt} />
          )}
        </div>
      </div>

      {/* Pipeline */}
      {!cancelled && (
        <ol className="mt-8 grid grid-cols-4 gap-2">
          {PIPELINE_STEPS.map((s, i) => (
            <li key={s.key} className="text-center">
              <div
                className={`h-1.5 rounded-full ${
                  i <= active ? "bg-brand-gold" : "bg-border"
                }`}
              />
              <p
                className={`mt-2 text-xs ${
                  i <= active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </p>
            </li>
          ))}
        </ol>
      )}

      {order.paymentStatus === "pending" && order.paymentMethod === "zelle" && (
        <Card className="mt-8 border-brand-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <p className="text-sm">
              We&apos;re waiting on your Zelle transfer. Amount:{" "}
              <strong>{formatMoney(order.totalCents)}</strong>, memo:{" "}
              <strong className="font-mono">{order.orderCode}</strong>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/checkout/zelle/${order.orderCode}`}>
                Payment instructions
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      {order.paymentStatus === "paid" && (
        <div className="mt-8 space-y-4">
          <h2 className="font-display text-xl">
            Your account{order.quantity > 1 ? "s" : ""}
          </h2>
          {items.map((d, idx) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span>
                    Account {idx + 1}
                    {d.status === "replaced" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (replaced under warranty)
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {d.status === "pending"
                      ? "Sourcing…"
                      : d.status === "ready"
                        ? "Ready to reveal"
                        : d.status === "delivered"
                          ? `Delivered ${d.deliveredAt ? formatDate(d.deliveredAt) : ""}`
                          : "Replaced"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {d.status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    We&apos;re sourcing this account from our supplier network.
                    You&apos;ll get an email the moment credentials are ready.
                  </p>
                )}
                {(d.status === "ready" || d.status === "delivered") &&
                  d.credential &&
                  !d.credential.revealLocked &&
                  !d.credential.revoked && <RevealPanel deliverableId={d.id} />}
                {d.credential?.revealLocked && (
                  <p className="text-sm text-muted-foreground">
                    Credentials were viewed
                    {d.credential.firstRevealedAt
                      ? ` on ${formatDate(d.credential.firstRevealedAt)}`
                      : ""}
                    . Lost them? Contact support and we&apos;ll re-enable access
                    after verification.
                  </p>
                )}
                {d.status === "delivered" && (
                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <WarrantyBadge deliveredAt={d.deliveredAt} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/claims/new?deliverable=${d.id}`}>
                        File warranty claim
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            New account? Follow the warmup guide before posting:{" "}
            <a
              className="underline"
              href={`${env.APP_URL}/warranty`}
            >
              keep your warranty valid
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
