import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { SupplierStockForm } from "@/components/marketing/supplier-stock-form";

export const metadata = { title: "Submit an account" };

export default async function SupplierSubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.submitToken, token),
  });

  return (
    <main className="bg-atmosphere flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8">
        {!supplier || !supplier.active ? (
          <p className="text-center text-sm text-muted-foreground">
            This submission link is no longer active. Ask ACCSHOP for a new
            link.
          </p>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium">
              Submit an account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hi {supplier.name}, drop in the username, password, and linked
              email for one account. Submit again for each additional
              account.
            </p>
            <div className="gold-hairline my-6" />
            <SupplierStockForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
