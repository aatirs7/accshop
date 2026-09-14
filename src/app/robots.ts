import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Public crawl rules. Reputation/security scanners treat a missing robots
 * file and sitemap as a signal of a throwaway site, so both are served.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/authenticated areas — nothing to index there.
      disallow: ["/admin", "/dashboard", "/supplier", "/checkout", "/api/"],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
