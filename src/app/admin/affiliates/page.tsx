import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates, orders } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { markAffiliateCommissionsPaid } from "@/actions/admin/affiliates";
import { ActionButton } from "@/components/admin/action-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAffiliatesPage() {
  const rows = await db.query.affiliates.findMany({
    with: { user: true },
    orderBy: desc(affiliates.createdAt),
  });

  const stats = await Promise.all(
    rows.map(async (a) => {
      const [[orderAgg], comms] = await Promise.all([
        db
          .select({
            referrals: sql<number>`count(*)`,
            revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
          })
          .from(orders)
          .where(eq(orders.affiliateId, a.id)),
        db.query.affiliateCommissions.findMany({
          where: eq(affiliateCommissions.affiliateId, a.id),
        }),
      ]);
      const accrued = comms
        .filter((c) => c.status === "accrued")
        .reduce((s, c) => s + c.amountCents, 0);
      const paid = comms
        .filter((c) => c.status === "paid")
        .reduce((s, c) => s + c.amountCents, 0);
      return {
        affiliate: a,
        referrals: Number(orderAgg.referrals),
        revenue: Number(orderAgg.revenue),
        accrued,
        paid,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Affiliates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Self-serve referrers. They earn 10% per referred sale; settle owed
          commission after you pay them out.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {stats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No affiliates yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.affiliate.id}>
                    <TableCell>
                      <span className="font-medium">
                        {s.affiliate.user.name ?? s.affiliate.user.email}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.affiliate.user.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        joined {formatDate(s.affiliate.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-brand-gold">
                      {s.affiliate.code}
                    </TableCell>
                    <TableCell className="text-right">{s.referrals}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(s.revenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-brand-gold">
                      {formatMoney(s.accrued)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatMoney(s.paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.accrued > 0 && (
                        <ActionButton
                          action={markAffiliateCommissionsPaid.bind(
                            null,
                            s.affiliate.id,
                          )}
                          confirmText={`Mark ${formatMoney(s.accrued)} as paid out to this affiliate?`}
                          successText="Marked paid"
                        >
                          Settle
                        </ActionButton>
                      )}
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
