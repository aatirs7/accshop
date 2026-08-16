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
        {/* Mobile: image, title, buy option first (order-*), extra details
            pushed below. Desktop: title/gallery/details in the left column,
            buy box sticky in the right column (grid placement). */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-x-12 lg:gap-y-10">
          <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1">
            <Badge
              variant="outline"
              className="border-brand-gold/40 text-brand-gold"
            >
              {product.tierLabel} tier
            </Badge>
            <h1 className="mt-4 font-display text-4xl font-medium leading-tight sm:text-5xl">
              {product.name}
            </h1>
          </div>

          <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-2">
            <ProductGallery
              images={images.map((i) => ({ id: i.id, url: i.url }))}
              tierLabel={product.tierLabel}
              alt={product.name}
            />
          </div>

          <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-1">
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

          <div className="order-4 lg:order-none lg:col-start-1 lg:row-start-3">
            <p className="max-w-xl leading-relaxed text-muted-foreground">
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
        </div>
      </div>
    </main>
  );
}
