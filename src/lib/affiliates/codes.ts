import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates, partners } from "@/lib/db/schema";
import { PROMO_CODES } from "@/lib/promo-codes";

/** Codes are 3-20 letters, numbers or dashes, stored uppercase. */
export const CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/;
/** Usernames are 3-24 lowercase letters, numbers, dots or underscores. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/;

const RESERVED = new Set(["ADMIN", "ACCSHOP", "ACCSHOPP", "TEST", "NULL", "NONE", "SUPPORT"]);

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

/** Format check only. Returns an error message, or null when it is valid. */
export function codeFormatError(code: string): string | null {
  if (!CODE_RE.test(code)) {
    return "Codes are 3 to 20 characters: letters, numbers or dashes.";
  }
  if (RESERVED.has(code) || code in PROMO_CODES) {
    return "That code is reserved. Pick another one.";
  }
  return null;
}

export function usernameFormatError(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Usernames are 3 to 24 characters: lowercase letters, numbers, dots or underscores.";
  }
  return null;
}

/**
 * Is this referral code free to use? Checks affiliate codes and coach
 * (partner) referral codes, since checkout matches both from the same box.
 * Pass the affiliate's own id to allow re-saving their current code.
 */
export async function isCodeAvailable(code: string, exceptAffiliateId?: string): Promise<boolean> {
  const aff = await db.query.affiliates.findFirst({
    where: exceptAffiliateId
      ? and(eq(affiliates.code, code), ne(affiliates.id, exceptAffiliateId))
      : eq(affiliates.code, code),
    columns: { id: true },
  });
  if (aff) return false;
  const partner = await db.query.partners.findFirst({
    where: sql`upper(${partners.referralCode}) = ${code}`,
    columns: { id: true },
  });
  return !partner;
}

export async function isUsernameAvailable(username: string, exceptAffiliateId?: string): Promise<boolean> {
  const row = await db.query.affiliates.findFirst({
    where: exceptAffiliateId
      ? and(eq(affiliates.username, username), ne(affiliates.id, exceptAffiliateId))
      : eq(affiliates.username, username),
    columns: { id: true },
  });
  return !row;
}
