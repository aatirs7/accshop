import { and, eq, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerPricingRules, partners, products } from "@/lib/db/schema";

export interface ResolvedPrice {
  unitPriceCents: number;
  source: "retail" | "partner";
  partnerId: string | null;
}

/**
 * Retail price unless the buyer is an approved partner with a qty-tier rule
 * for this product — then the highest min_qty ≤ ordered qty wins. Partner
 * pricing is never applied for suspended partners.
 */
export async function resolveUnitPrice(
  userId: string | null,
  productId: string,
  quantity: number,
): Promise<ResolvedPrice> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) throw new Error("Unknown product");

  const retail: ResolvedPrice = {
    unitPriceCents: product.retailPriceCents,
    source: "retail",
    partnerId: null,
  };
  if (!userId) return retail;

  const partner = await db.query.partners.findFirst({
    where: and(eq(partners.userId, userId), eq(partners.status, "approved")),
  });
  if (!partner) return retail;

  const rule = await db.query.partnerPricingRules.findFirst({
    where: and(
      eq(partnerPricingRules.partnerId, partner.id),
      eq(partnerPricingRules.productId, productId),
      lte(partnerPricingRules.minQty, quantity),
    ),
    orderBy: desc(partnerPricingRules.minQty),
  });
  if (!rule) {
    // Approved partner but no tier reached: retail price, still attributed
    // to the partner for volume history.
    return { ...retail, source: "partner", partnerId: partner.id };
  }
  return {
    unitPriceCents: rule.unitPriceCents,
    source: "partner",
    partnerId: partner.id,
  };
}
