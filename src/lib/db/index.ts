import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Database = PgliteDatabase<typeof schema>;

// Cached on globalThis so dev HMR doesn't open a new connection (or a second
// PGlite instance against the same data dir) on every reload.
const globalForDb = globalThis as unknown as { db?: Database };

function createDb(): Database {
  if (env.DATABASE_URL.startsWith("postgres")) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    // neon-serverless (WebSocket) rather than neon-http: supports transactions
    return drizzleNeon(pool, { schema }) as unknown as Database;
  }
  // Embedded dev database — no local Postgres install needed
  return drizzlePglite(new PGlite("./.pglite"), { schema });
}

export const db = globalForDb.db ?? (globalForDb.db = createDb());
