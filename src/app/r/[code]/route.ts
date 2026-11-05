import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { AFF_COOKIE, affCookieOptions, cleanAffCode } from "@/lib/affiliate-ref";

/** accshopp.com/r/CODE: tag the visitor to that affiliate, then send them to the store. */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code: raw } = await ctx.params;
  const code = cleanAffCode(raw);
  const res = NextResponse.redirect(new URL("/accounts", request.url));
  if (!code) return res;
  const affiliate = await db.query.affiliates.findFirst({
    where: and(eq(affiliates.code, code), eq(affiliates.status, "active")),
    columns: { id: true },
  });
  if (affiliate) res.cookies.set(AFF_COOKIE, code, affCookieOptions);
  return res;
}
