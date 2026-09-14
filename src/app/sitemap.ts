export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { env } from "@/lib/env";

const staticPaths = [
  "",
  "/accounts",
  "/testimonials",
  "/warranty",
  "/refund-policy",
  "/partners",
  "/affiliates",
  "/bulk",
  "/contact",
  "/leave-review",
  "/terms",
  "/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL;
  const live = await db
    .select({ slug: products.slug, createdAt: products.createdAt })
    .from(products)
    .where(eq(products.active, true));

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
    })),
    ...live.map((p) => ({
      url: `${base}/accounts/${p.slug}`,
      lastModified: p.createdAt,
    })),
  ];
}
