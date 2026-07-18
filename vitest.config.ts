import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      // Test-only key material — not used anywhere else.
      AUTH_SECRET: "test-secret-test-secret",
      CREDENTIAL_KEY_V1: Buffer.alloc(32, 7).toString("base64"),
      DATABASE_URL: "pglite",
    },
  },
});
