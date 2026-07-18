import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Daily Vercel cron: cancel Zelle orders left unpaid for more than 48 hours
 * so the admin's awaiting-payment queue stays honest.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const expired = await db
    .update(orders)
    .set({ paymentStatus: "cancelled" })
    .where(
      and(
        eq(orders.paymentMethod, "zelle"),
        eq(orders.paymentStatus, "pending"),
        lt(orders.createdAt, cutoff),
      ),
    )
    .returning({ id: orders.id, orderCode: orders.orderCode });

  for (const o of expired) {
    await audit({
      action: "order.expired_zelle",
      entityType: "order",
      entityId: o.id,
      metadata: { orderCode: o.orderCode },
    });
  }

  return NextResponse.json({ cancelled: expired.length });
}
