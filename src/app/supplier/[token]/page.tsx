import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockAccounts, suppliers } from "@/lib/db/schema";
import { SupplierAccountForm } from "@/components/supplier/account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupplierPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supplier = await db.query.suppliers.findFirst({
    where: and(eq(suppliers.accessToken, token), eq(suppliers.active, true)),
  });
  if (!supplier) notFound();

  const [productList, available] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.active, true),
      orderBy: asc(products.sort),
      columns: { id: true, name: true, tierLabel: true },
    }),
    db
      .select({ productId: stockAccounts.productId, id: stockAccounts.id })
      .from(stockAccounts)
      .where(eq(stockAccounts.used, false)),
  ]);
  const availableCounts = new Map<string, number>();
  for (const row of available) {
    availableCounts.set(row.productId, (availableCounts.get(row.productId) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Add accounts — {supplier.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the account type, then enter its username, password, and email.
            Submit one form per account.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SupplierAccountForm
            token={token}
            products={productList.map((p) => ({
              id: p.id,
              label: `${p.name} — ${p.tierLabel}`,
            }))}
          />
          <div className="border-t border-border/60 pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Ready in stock
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {productList.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span>{availableCounts.get(p.id) ?? 0} waiting for a buyer</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
