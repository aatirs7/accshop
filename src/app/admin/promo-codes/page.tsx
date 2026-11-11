import { requireAdminPage } from "@/lib/auth-helpers";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { PROMO_CODES } from "@/lib/promo-codes";
import { disabledPromoCodes } from "@/lib/promo-status";
import { setPromoCodeActive } from "@/actions/admin/promo-codes";
import { ActionButton } from "@/components/admin/action-button";
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

export const metadata = { title: "Promo codes" };

export default async function PromoCodesPage() {
  await requireAdminPage();
  const [off, uses] = await Promise.all([
    disabledPromoCodes(),
    db
      .select({ code: orders.discountCode, n: count() })
      .from(orders)
      .where(and(isNotNull(orders.discountCode), eq(orders.paymentStatus, "paid")))
      .groupBy(orders.discountCode),
  ]);
  const usedBy = new Map(uses.map((u) => [u.code, u.n]));
  const codes = Object.entries(PROMO_CODES).sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Promo codes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn a code off and it stops working at checkout right away. Turn it back on any time.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {codes.length - off.size} of {codes.length} codes on
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Takes off</TableHead>
                <TableHead className="text-right">Paid orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Switch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(([code, cents]) => {
                const on = !off.has(code);
                return (
                  <TableRow key={code}>
                    <TableCell className="font-mono text-brand-gold">{code}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(cents)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{usedBy.get(code) ?? 0}</TableCell>
                    <TableCell>
                      {on ? (
                        <Badge variant="outline" className="border-brand-success/40 text-brand-success">On</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Off</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        action={setPromoCodeActive.bind(null, code, !on)}
                        variant={on ? "outline" : "default"}
                        successText={on ? `${code} is off` : `${code} is on`}
                      >
                        {on ? "Turn off" : "Turn on"}
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
