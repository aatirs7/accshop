import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "pglite";
const shared = {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
} as const;

export default defineConfig(
  url.startsWith("postgres")
    ? { dialect: "postgresql", ...shared, dbCredentials: { url } }
    : {
        dialect: "postgresql",
        driver: "pglite",
        ...shared,
        dbCredentials: { url: "./.pglite" },
      },
);
