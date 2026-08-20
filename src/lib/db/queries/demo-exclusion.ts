import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Accounts created by scripts/seed.ts to demo the admin dashboard locally.
// Orders tied to these users must never count toward real revenue/order
// numbers shown in the admin panel.
const DEMO_EMAILS = ["demo.customer@example.com", "demo.partner@example.com"];

export async function demoUserIds() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, DEMO_EMAILS));
  return rows.map((r) => r.id);
}
