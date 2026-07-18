import Link from "next/link";
import { partnerVolumes } from "@/lib/db/queries/reporting";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminPartnersPage() {
  const partners = await partnerVolumes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk buyers and referrers with custom pricing. New partners come in
          through <Link href="/admin/applications" className="underline">applications</Link>.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.partnerId}>
                  <TableCell>
                    <Link
                      href={`/admin/partners/${p.partnerId}`}
                      className="font-medium hover:underline"
                    >
                      {p.businessName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "approved"
                          ? "border-brand-success/50 text-brand-success"
                          : "border-destructive/50 text-destructive"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{Number(p.orderCount)}</TableCell>
                  <TableCell className="text-right">{Number(p.accountsSold)}</TableCell>
                  <TableCell className="text-right font-medium text-brand-gold">
                    {formatMoney(Number(p.revenueCents))}
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
