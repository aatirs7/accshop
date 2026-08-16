import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, productVariants, products } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductEditor } from "@/components/admin/product-editor";

export default async function AdminProductsPage() {
  const catalog = await db.query.products.findMany({
    orderBy: asc(products.sort),
  });

  const editors = await Promise.all(
    catalog.map(async (p) => {
      const [images, variants] = await Promise.all([
        db.query.productImages.findMany({
          where: eq(productImages.productId, p.id),
          orderBy: asc(productImages.sort),
        }),
        db.query.productVariants.findMany({
          where: eq(productVariants.productId, p.id),
          orderBy: asc(productVariants.sort),
        }),
      ]);
      return { product: p, images, variants };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing, stock label, featured flag, gallery images, and variants.
          New tiers are added by seeding a new product row.
        </p>
      </div>

      {editors.map(({ product, images, variants }) => (
        <Card key={product.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              {product.name}
              <Badge variant="outline">{product.tierLabel}</Badge>
              <span className="text-sm font-normal text-brand-gold">
                {formatMoney(product.retailPriceCents)}
              </span>
              {product.featured && (
                <Badge
                  variant="outline"
                  className="border-brand-gold/40 text-brand-gold"
                >
                  Featured
                </Badge>
              )}
              {!product.active && <Badge variant="outline">Hidden</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductEditor
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                retailPriceCents: product.retailPriceCents,
                costCents: product.costCents,
                compareAtPriceCents: product.compareAtPriceCents,
                stockLabel: product.stockLabel,
                screenshotUrl: product.screenshotUrl,
                featured: product.featured,
                active: product.active,
                images: images.map((i) => ({ id: i.id, url: i.url })),
                variants: variants.map((v) => ({
                  id: v.id,
                  label: v.label,
                  priceDeltaCents: v.priceDeltaCents,
                })),
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
