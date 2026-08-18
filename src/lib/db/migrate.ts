import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";
import { env } from "@/lib/env";

/**
 * There's no separate migration-deploy step for this project (Vercel just
 * runs `next build`/`next start`), so pending Drizzle migrations are applied
 * here on server boot instead. Safe to call on every cold start: drizzle
 * tracks applied migrations in `drizzle.__drizzle_migrations` and skips
 * ones already run.
 */
export async function runPendingMigrations() {
  if (!env.DATABASE_URL.startsWith("postgres")) return; // pglite dev DB: `npm run db:migrate`

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } catch (err) {
    console.error("Startup migration failed:", err);
  } finally {
    await pool.end();
  }
}
