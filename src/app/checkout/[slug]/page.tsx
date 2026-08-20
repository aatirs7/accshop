import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  partnerPricingRules,
  partners,
  productVariants,
  products,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { CheckoutForm, type PriceTier } from "@/components/checkout/checkout-form";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; variant?: string; code?: string }>;
}) {
  const [{ slug }, { ref, variant, code }] = await Promise.all([
    params,
    searchParams,
  ]);
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.active, true)),
  });
  if (!product) notFound();

  const variants = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, product.id),
    orderBy: asc(productVariants.sort),
  });

  const session = await auth();
  let partnerTiers: PriceTier[] = [];
  if (session?.user) {
    const partner = await db.query.partners.findFirst({
      where: and(
        eq(partners.userId, session.user.id),
        eq(partners.status, "approved"),
      ),
    });
    if (partner) {
      const rules = await db.query.partnerPricingRules.findMany({
        where: and(
          eq(partnerPricingRules.partnerId, partner.id),
          eq(partnerPricingRules.productId, product.id),
        ),
        orderBy: asc(partnerPricingRules.minQty),
      });
      partnerTiers = rules.map((r) => ({
        minQty: r.minQty,
        unitPriceCents: r.unitPriceCents,
      }));
    }
  }

  return (
    <main className="bg-atmosphere min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Link
          href={`/accounts/${product.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {product.name}
        </Link>
        <div className="mt-6 rounded-2xl border border-border/60 bg-card/70 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-medium">
                {product.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(product.retailPriceCents)} per account
                {partnerTiers.length > 0 && " · partner rates active"}
              </p>
            </div>
            {partnerTiers.length > 0 && (
              <Badge
                variant="outline"
                className="border-brand-gold/40 text-brand-gold"
              >
                Partner pricing
              </Badge>
            )}
          </div>
          <div className="gold-hairline my-6" />
          <CheckoutForm
            productSlug={product.slug}
            retailUnitCents={product.retailPriceCents}
            partnerTiers={partnerTiers}
            prefillEmail={session?.user?.email ?? null}
            isSignedIn={Boolean(session?.user)}
            refPartner={ref ?? null}
            variants={variants.map((v) => ({
              id: v.id,
              label: v.label,
              priceDeltaCents: v.priceDeltaCents,
            }))}
            initialVariantId={
              variants.find((v) => v.id === variant)?.id ??
              variants[0]?.id ??
              null
            }
            initialReferralCode={(code ?? ref ?? "").toUpperCase() || null}
          />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your account details are emailed to you within 1-5 hours of
          payment, plus a 14-day replacement warranty. See our{" "}
          <Link href="/warranty" className="underline">
            warranty policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
