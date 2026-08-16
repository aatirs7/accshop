export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, productVariants, products, testimonials } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { ProductGallery } from "@/components/marketing/product-gallery";
import { ProductBuyBox } from "@/components/marketing/product-buy-box";

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

  const [images, variants, quotes] = await Promise.all([
    db.query.productImages.findMany({
      where: eq(productImages.productId, product.id),
      orderBy: asc(productImages.sort),
    }),
    db.query.productVariants.findMany({
      where: eq(productVariants.productId, product.id),
      orderBy: asc(productVariants.sort),
    }),
    db.query.testimonials.findMany({
      where: eq(testimonials.published, true),
      orderBy: asc(testimonials.sort),
      limit: 2,
    }),
  ]);

  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        {/* On mobile the buy box comes first so the price + Buy button are
            visible instantly; on desktop it sits in the right column. */}
        <div className="flex flex-col-reverse gap-12 lg:grid lg:grid-cols-[1.2fr_1fr]">
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

            <div className="mt-6">
              <ProductGallery
                images={images.map((i) => ({ id: i.id, url: i.url }))}
                tierLabel={product.tierLabel}
                alt={product.name}
              />
            </div>

            <p className="mt-8 max-w-xl leading-relaxed text-muted-foreground">
              {product.description}
            </p>
            <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              {[
                `${product.followerMin.toLocaleString()}+ real followers`,
                "TikTok Shop Affiliate eligible",
                "Aged & warmed before sale",
                "Full credentials + linked email",
                "Step-by-step warmup guide",
                "14-day replacement warranty",
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

          <ProductBuyBox
            slug={product.slug}
            basePriceCents={product.retailPriceCents}
            compareAtPriceCents={product.compareAtPriceCents}
            stockLabel={product.stockLabel}
            variants={variants.map((v) => ({
              id: v.id,
              label: v.label,
              priceDeltaCents: v.priceDeltaCents,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
