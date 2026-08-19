import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables as deliverablesTable, orders, suppliers } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { nextFulfillmentStatus, pipelineStage } from "@/lib/orders/status";
import {
  markOrderDelivered,
  markZellePaid,
  unlockReveal,
} from "@/actions/admin/orders";
import { revokeCredentials } from "@/actions/admin/credentials";
import {
  ActionButton,
  PromptActionButton,
} from "@/components/admin/action-button";
import {
  AdminNotes,
  AdvanceStageButton,
  AssignSupplierForm,
  AttachCredentialsForm,
  EmailAccountButton,
} from "@/components/admin/order-workbench";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge } from "@/components/dashboard/status-badges";

const STAGE_LABELS = {
  credentials_ready: "Credentials ready",
  delivered: "Delivered",
} as const;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderCode, orderCode.toUpperCase()),
    with: { user: true, product: true, partner: true },
  });
  if (!order) notFound();

  const [items, supplierList] = await Promise.all([
    db.query.deliverables.findMany({
      where: eq(deliverablesTable.orderId, order.id),
      with: { credential: true, supplier: true },
      orderBy: asc(deliverablesTable.createdAt),
    }),
    db.query.suppliers.findMany({
      where: eq(suppliers.active, true),
      orderBy: asc(suppliers.name),
    }),
  ]);

  // Cost = per-account override where set, else the product's cost basis.
  const costCents =
    items.length > 0
      ? items.reduce((s, d) => s + (d.costCents ?? order.product.costCents), 0)
      : order.quantity * order.product.costCents;
  const next = nextFulfillmentStatus(order.fulfillmentStatus);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All orders
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-lg tracking-[0.1em] text-brand-gold">
              {order.orderCode}
            </p>
            <h1 className="mt-1 font-display text-2xl font-medium">
              {order.quantity}× {order.product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                href={`/admin/customers/${order.userId}`}
                className="underline hover:text-foreground"
              >
                {order.user.email}
              </Link>{" "}
              · placed {formatDate(order.createdAt)} · {order.paymentMethod}
              {order.partner && (
                <>
                  {" "}
                  · partner:{" "}
                  <Link
                    href={`/admin/partners/${order.partner.id}`}
                    className="underline"
                  >
                    {order.partner.businessName}
                  </Link>{" "}
                  ({order.source})
                </>
              )}
            </p>
          </div>
          <StageBadge order={order} />
        </div>
      </div>

      {/* Money summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Revenue
            </p>
            <p className="mt-1 font-display text-2xl">
              {formatMoney(order.totalCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.quantity} × {formatMoney(order.unitPriceCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Cost
            </p>
            <p className="mt-1 font-display text-2xl">
              {formatMoney(costCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatMoney(order.product.costCents)}/account
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Margin
            </p>
            <p className="mt-1 font-display text-2xl text-brand-gold">
              {formatMoney(order.totalCents - costCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment / stage actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {order.paymentStatus === "pending" && (
            <>
              <p className="w-full text-sm text-muted-foreground">
                Card payments confirm automatically via Stripe. Use this only if
                the webhook is delayed or you took payment another way.
              </p>
              <PromptActionButton
                action={markZellePaid.bind(null, order.id)}
                promptText={`Payment reference for ${order.orderCode} (optional):`}
                variant="default"
                successText="Marked paid"
                allowEmpty
              >
                Mark paid manually, {formatMoney(order.totalCents)}
              </PromptActionButton>
            </>
          )}
          {order.paymentStatus === "paid" && next === "credentials_ready" && (
            <EmailAccountButton orderId={order.id} />
          )}
          {order.paymentStatus === "paid" && next && next !== "credentials_ready" && (
            <AdvanceStageButton
              orderId={order.id}
              to={next}
              label={STAGE_LABELS[next as keyof typeof STAGE_LABELS] ?? next}
            />
          )}
          {order.paymentStatus === "paid" &&
            order.fulfillmentStatus !== "delivered" && (
              <ActionButton
                action={markOrderDelivered.bind(null, order.id)}
                variant="default"
                confirmText="Mark this order delivered? Do this once you've emailed the customer their account. It starts the 14-day warranty and shows as fulfilled to any referring affiliate/coach."
                successText="Marked delivered"
              >
                Mark delivered (I emailed the account)
              </ActionButton>
            )}
          {order.paymentStatus === "paid" && !next && (
            <p className="text-sm text-muted-foreground">
              Order fully delivered
              {order.deliveredAt ? ` on ${formatDate(order.deliveredAt)}` : ""}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deliverables workbench */}
      {order.paymentStatus === "paid" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Accounts ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((d, idx) => (
              <div
                key={d.id}
                className="rounded-lg border border-border/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    Account {idx + 1}
                    {d.replacesDeliverableId && (
                      <span className="ml-2 text-xs text-brand-warning">
                        warranty replacement
                      </span>
                    )}
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {d.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-4">
                  <AssignSupplierForm
                    deliverableId={d.id}
                    suppliers={supplierList.map((s) => ({
                      id: s.id,
                      name: s.name,
                      defaultCostCents: s.defaultCostCents,
                    }))}
                    currentSupplierId={d.supplierId}
                    currentCostCents={d.costCents}
                  />
                  {d.supplier && (
                    <p className="text-xs text-muted-foreground">
                      Sourced from {d.supplier.name}
                      {d.costCents != null && ` for ${formatMoney(d.costCents)}`}
                    </p>
                  )}

                  {!d.credential && d.status !== "replaced" && (
                    <AttachCredentialsForm deliverableId={d.id} />
                  )}
                  {d.credential && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span
                        className={
                          d.credential.revoked
                            ? "text-destructive"
                            : "text-brand-success"
                        }
                      >
                        {d.credential.revoked
                          ? "Credentials revoked"
                          : `Credentials attached (${d.credential.fingerprint ?? "•••"})`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.credential.revealLocked
                          ? `Viewed by customer${d.credential.firstRevealedAt ? ` ${formatDate(d.credential.firstRevealedAt)}` : ""} · ${d.credential.revealCount}×`
                          : "Not yet viewed"}
                      </span>
                      {d.credential.revealLocked && !d.credential.revoked && (
                        <ActionButton
                          action={unlockReveal.bind(null, d.credential.id)}
                          confirmText="Re-enable a one-time reveal for this customer? Do this only after verifying their identity."
                          successText="Reveal unlocked"
                        >
                          Unlock re-reveal
                        </ActionButton>
                      )}
                      {!d.credential.revoked && (
                        <ActionButton
                          action={revokeCredentials.bind(null, d.credential.id)}
                          variant="destructive"
                          confirmText="Revoke these credentials? The customer will no longer be able to view them."
                          successText="Revoked"
                        >
                          Revoke
                        </ActionButton>
                      )}
                      {d.credential.revoked && d.status !== "replaced" && (
                        <AttachCredentialsForm deliverableId={d.id} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminNotes orderId={order.id} initial={order.adminNotes ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
