import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (embedded dev DB) loads WASM from disk — it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
