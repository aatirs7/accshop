import type { NextConfig } from "next";

/**
 * Browser-hardening headers sent with every response. These are what
 * corporate firewalls, antivirus "web shield" features and security scanners
 * look for when deciding whether a site is trustworthy; a missing set is a
 * common reason a legitimate storefront gets flagged as "not secure".
 *
 * Script/style sources are deliberately left out of the CSP: Next.js relies
 * on inline hydration scripts, so locking those down needs per-request nonces.
 * Everything else that can be locked down without a nonce is.
 */
const securityHeaders = [
  // Force HTTPS for two years, including subdomains, and allow browser preload.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Never embed the site in another site's iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers guess content types of responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin (not full URL, which can carry order codes) off-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The store never needs these device features.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // PGlite (embedded dev DB) loads WASM from disk — it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Startup migrations (src/instrumentation.ts) read these raw .sql files
  // via fs at runtime, so they must be traced into the server bundle.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  // Hide the framework fingerprint scanners key on.
  poweredByHeader: false,
  experimental: {
    // Allow phone-sized photo uploads through server actions.
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
