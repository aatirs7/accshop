import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { salesSince } from "@/lib/db/queries/reporting";

export const runtime = "nodejs";

/**
 * Polled by the admin overview: paid orders that landed after `since`
 * (ms since epoch). Powers the "money ding" and confetti the moment a sale
 * comes in, without the page needing a websocket.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = Number(new URL(request.url).searchParams.get("since"));
  const now = Date.now();
  const sales =
    Number.isFinite(since) && since > 0 ? await salesSince(new Date(since)) : [];

  return NextResponse.json(
    { now, sales },
    { headers: { "Cache-Control": "no-store" } },
  );
}
