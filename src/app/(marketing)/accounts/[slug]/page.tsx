import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, testimonials } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestimonialCard } from "@/components/marketing/testimonial-card";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.active, true)),
  });
  if (!product) notFound();

  const quotes = await db.query.testimonials.findMany({
    where: eq(testimonials.published, true),
    orderBy: asc(testimonials.sort),
    limit: 2,
  });

  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge
              variant="outline"
              className="border-brand-gold/40 text-brand-gold"
            >
              {product.tierLabel} tier
            </Badge>
            <h1 className="mt-4 font-display text-4xl font-medium leading-tight sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
              {product.description}
            </p>
            <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              {[
                `${product.followerMin.toLocaleString()}+ real followers`,
                "TikTok Shop Affiliate eligible",
                "Aged & warmed before sale",
                "Full credentials + linked email",
                "Step-by-step warmup guide",
                "30-day replacement warranty",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-gold">✦</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {quotes.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          </div>

          {/* Buy box */}
          <aside className="h-fit rounded-2xl border border-brand-gold/25 bg-card/70 p-8 lg:sticky lg:top-24">
            <p className="text-sm text-muted-foreground">Price per account</p>
            <p className="mt-1 font-display text-5xl text-brand-gold">
              {formatMoney(product.retailPriceCents)}
            </p>
            <div className="gold-hairline my-6" />
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>✓ Pay by card or Zelle</li>
              <li>✓ Encrypted delivery via your dashboard</li>
              <li>✓ Warranty countdown tracked per order</li>
            </ul>
            <Button asChild size="lg" className="mt-8 w-full">
              <Link href={`/checkout/${product.slug}`}>Buy now</Link>
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Ordering 10+? <Link href="/bulk" className="underline">Get bulk pricing</Link>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
