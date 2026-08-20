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

// The owner's own real-money test purchases. Unlike DEMO_EMAILS these orders
// are real and stay visible in the Orders list, they're just excluded from
// revenue/margin/accounts-sold so testing doesn't skew real numbers.
const TEST_BUYER_EMAILS = ["aashirsiddiqui13@gmail.com"];

export async function testBuyerUserIds() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, TEST_BUYER_EMAILS));
  return rows.map((r) => r.id);
}
