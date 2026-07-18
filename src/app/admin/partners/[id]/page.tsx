import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  commissions,
  orders,
  partnerPricingRules,
  partners,
  products,
} from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { deletePricingRule } from "@/actions/admin/partners";
import { ActionButton } from "@/components/admin/action-button";
import {
  PartnerSettingsControls,
  PricingRuleForm,
} from "@/components/admin/queue-actions";
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

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, id),
    with: { user: true },
  });
  if (!partner) notFound();

  const [rules, productList, partnerOrders, commissionRows] = await Promise.all([
    db.query.partnerPricingRules.findMany({
      where: eq(partnerPricingRules.partnerId, id),
      with: { product: true },
      orderBy: [asc(partnerPricingRules.productId), asc(partnerPricingRules.minQty)],
    }),
    db.query.products.findMany({
      where: eq(products.active, true),
      orderBy: asc(products.sort),
    }),
    db.query.orders.findMany({
      where: eq(orders.partnerId, id),
      with: { product: true },
      orderBy: desc(orders.createdAt),
      limit: 50,
    }),
    db.query.commissions.findMany({
      where: eq(commissions.partnerId, id),
      with: { order: true },
      orderBy: desc(commissions.createdAt),
    }),
  ]);

  const accrued = commissionRows
    .filter((c) => c.status === "accrued")
    .reduce((s, c) => s + c.amountCents, 0);
  const paidOut = commissionRows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amountCents, 0);
  const paidOrders = partnerOrders.filter((o) => o.paymentStatus === "paid");
  const volume = paidOrders.reduce((s, o) => s + o.totalCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/partners"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All partners
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-medium">
            {partner.businessName}
          </h1>
          <Badge
            variant="outline"
            className={
              partner.status === "approved"
                ? "border-brand-success/50 text-brand-success"
                : "border-destructive/50 text-destructive"
            }
          >
            {partner.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {partner.user.email}
          {partner.approvedAt && ` · partner since ${formatDate(partner.approvedAt)}`}
          {partner.commissionRateBps
            ? ` · ${partner.commissionRateBps / 100}% referral commission`
            : " · no referral commission"}
        </p>
        {partner.notes && (
          <p className="mt-2 text-sm text-muted-foreground">{partner.notes}</p>
        )}
        <div className="mt-4">
          <PartnerSettingsControls
            partnerId={partner.id}
            commissionRateBps={partner.commissionRateBps}
            status={partner.status}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Paid volume
            </p>
            <p className="mt-1 font-display text-2xl text-brand-gold">
              {formatMoney(volume)}
            </p>
            <p className="text-xs text-muted-foreground">
              {paidOrders.reduce((s, o) => s + o.quantity, 0)} accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Commission owed
            </p>
            <p className="mt-1 font-display text-2xl">{formatMoney(accrued)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Commission paid out
            </p>
            <p className="mt-1 font-display text-2xl">{formatMoney(paidOut)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wholesale pricing rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Min qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.product.name}</TableCell>
                    <TableCell className="text-right">{r.minQty}+</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(r.unitPriceCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        action={deletePricingRule.bind(null, r.id)}
                        variant="ghost"
                        confirmText="Delete this pricing rule?"
                        successText="Rule deleted"
                      >
                        Remove
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PricingRuleForm
            partnerId={partner.id}
            products={productList.map((p) => ({ id: p.id, name: p.name }))}
          />
          <p className="text-xs text-muted-foreground">
            Referral link for this partner:{" "}
            <code className="rounded bg-background px-1.5 py-0.5">
              /accounts?ref={partner.id}
            </code>{" "}
            — students who buy through it are attributed for commission.
          </p>
        </CardContent>
      </Card>

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
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerOrders.map((o) => (
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
                  <TableCell className="capitalize">{o.source}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(o.totalCents)}
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
