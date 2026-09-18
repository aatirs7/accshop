import { NextResponse } from "next/server";
import { eq, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A tiny heartbeat the admin dashboard polls to know when a new sale landed,
 * so it can play the money chime while the app is open. Returns the running
 * count of paid orders and the latest paid time; the client chimes when the
 * count goes up. Admin only, read only.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      paidCount: count(),
      latestPaidAt: sql<string | null>`max(${orders.paidAt})`,
    })
    .from(orders)
    .where(eq(orders.paymentStatus, "paid"));

  return NextResponse.json(
    { paidCount: Number(row?.paidCount ?? 0), latestPaidAt: row?.latestPaidAt ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
