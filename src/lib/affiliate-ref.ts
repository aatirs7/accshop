import { env } from "@/lib/env";

/**
 * Affiliate link attribution. Opening an affiliate's link (or any page with
 * ?code=) stores their code in a cookie, so the sale is credited even if the
 * buyer browses around and never types the code at checkout. A code typed at
 * checkout still wins, and a newer link replaces an older one (last click).
 */
export const AFF_COOKIE = "acc_aff";
/* Effectively permanent: 400 days is the longest a browser keeps a cookie
   (Chrome caps it there). Each affiliate's link itself never changes. */
export const AFF_MAX_AGE = 60 * 60 * 24 * 400;

/** Codes are short uppercase tokens; anything else is ignored. */
export function cleanAffCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9_-]{2,32}$/.test(code) ? code : null;
}

export function affiliateLink(code: string): string {
  return `${env.APP_URL}/r/${code}`;
}

export const affCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AFF_MAX_AGE,
  path: "/",
};
