import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { env } from "@/lib/env";

const SESSION_DAYS = 30;

/**
 * Creates an Auth.js-compatible database session and sets its cookie, so
 * `auth()` recognizes it. Used by password login and affiliate signup, and
 * coexists with magic-link sessions.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    sessionToken: token,
    userId,
    expires: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });

  const secure = env.APP_URL.startsWith("https");
  const cookieName = secure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** Unambiguous referral code, e.g. REF-7F3K9Q. */
export function generateReferralCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % 32];
  return `REF-${s}`;
}
