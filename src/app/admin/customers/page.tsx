import Link from "next/link";
import { topCustomers } from "@/lib/db/queries/reporting";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminCustomersPage() {
  const customers = await topCustomers(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone with at least one paid order, ranked by lifetime value.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Lifetime value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.userId}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.userId}`}
                      className="font-medium hover:underline"
                    >
                      {c.name ?? c.email}
                    </Link>
                    {c.name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{c.role}</TableCell>
                  <TableCell className="text-right">{Number(c.orderCount)}</TableCell>
                  <TableCell className="text-right">{Number(c.accountsBought)}</TableCell>
                  <TableCell className="text-right font-medium text-brand-gold">
                    {formatMoney(Number(c.ltvCents))}
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
