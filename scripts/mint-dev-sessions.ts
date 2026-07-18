/**
 * Dev helper: mints database sessions for the seeded admin + customer so
 * protected pages can be exercised with a cookie (no email round-trip).
 * Prints the two session tokens. Run with the dev server stopped.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { randomBytes } from "node:crypto";

async function mint(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new Error(`No user: ${email}`);
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    sessionToken: token,
    userId: user.id,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  console.log(`${user.role}\t${token}`);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
  await mint(adminEmail!);
  await mint("demo.customer@example.com");
  process.exit(0);
}

main();
