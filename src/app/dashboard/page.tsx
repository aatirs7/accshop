import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { referralDashboard } from "@/lib/db/queries/referrals";
import { env } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyField } from "@/components/dashboard/copy-field";

function statusLabel(row: { paymentStatus: string; fulfillmentStatus: string }) {
  if (row.paymentStatus === "pending") return "Awaiting payment";
  if (row.paymentStatus === "cancelled") return "Cancelled";
  if (row.paymentStatus === "refunded") return "Refunded";
  return row.fulfillmentStatus === "delivered" ? "Fulfilled" : "In progress";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await referralDashboard(user.id);

  if (!data.isReferrer) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-3xl font-medium">Referral dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          This account isn&apos;t set up as an affiliate or coach yet. Join the
          affiliate program to get a referral code and earn 10% on every sale.
        </p>
        <Button asChild className="mt-6">
          <Link href="/portal/signup">Become an affiliate</Link>
        </Button>
      </div>
    );
  }

  const link = `${env.APP_URL}/accounts?code=${data.code}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Your referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your code, earn {data.commissionRateBps / 100}% on every account
          your referrals buy.
        </p>
      </div>

      {/* Code + link */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <CopyField label="Your referral code" value={data.code ?? ""} />
          <CopyField label="Your referral link" value={link} />
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Paid referrals", value: String(data.paidCount) },
          { label: "Commission owed", value: formatMoney(data.accruedCents) },
          { label: "Commission paid", value: formatMoney(data.paidCents) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-display text-2xl text-brand-gold">
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referred orders */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold">Referred orders</h2>
          {data.rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Order</TableHead>
                    <TableHead className="text-right">Your commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.orderCode}>
                      <TableCell>{r.studentEmail}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            statusLabel(r) === "Fulfilled"
                              ? "border-brand-success/50 text-brand-success"
                              : ""
                          }
                        >
                          {statusLabel(r)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.totalCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.commissionCents > 0 ? (
                          <span className="text-brand-gold">
                            {formatMoney(r.commissionCents)}
                            {r.commissionStatus === "paid" && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (paid)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
