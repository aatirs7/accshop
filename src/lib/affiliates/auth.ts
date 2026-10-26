import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { AFFILIATE_JOIN_PATH, AFFILIATE_LOGIN_PATH } from "./constants";

export type AffiliateRow = typeof affiliates.$inferSelect;

/**
 * Authoritative check for /affiliates/* app pages and affiliate server
 * actions. Not signed in -> affiliate login. Signed in without an affiliate
 * profile -> the join page (which offers to finish setup). Suspended and
 * deactivated affiliates are still returned; callers decide what they may do
 * (see `canEarn`).
 */
export async function requireAffiliate(): Promise<{
  user: Session["user"];
  affiliate: AffiliateRow;
}> {
  const session = await auth();
  if (!session?.user) redirect(AFFILIATE_LOGIN_PATH);
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, session.user.id),
  });
  if (!affiliate) redirect(AFFILIATE_JOIN_PATH);
  return { user: session.user, affiliate };
}

/** Only active affiliates earn commission and can change their code. */
export function canEarn(affiliate: Pick<AffiliateRow, "status">): boolean {
  return affiliate.status === "active";
}

/** True when a pre-/affiliates affiliate still needs a username or payout info. */
export function needsProfile(
  affiliate: Pick<AffiliateRow, "username" | "payoutMethod" | "payoutHandle">,
): boolean {
  return !affiliate.username || !affiliate.payoutMethod || !affiliate.payoutHandle;
}
