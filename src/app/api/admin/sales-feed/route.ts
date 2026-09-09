import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recentSales } from "@/lib/db/queries/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Newest paid orders, polled by the Overview page so a fresh sale can ring
 * the money ding and confetti the moment it lands (see SaleCelebration).
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sales = await recentSales(10);
  return NextResponse.json(
    {
      sales: sales.map((s) => ({ ...s, paidAt: s.paidAt.toISOString() })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
