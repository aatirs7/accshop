"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { affiliates, partners, users } from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, generateReferralCode } from "@/lib/session";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim().min(1),
});

export type AuthState = { error: string } | null;

/**
 * Email + password login for anyone with a password (admins, coaches,
 * affiliates). Redirects admins to /admin, everyone else to the portal.
 */
export async function passwordLogin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password." };
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Incorrect email or password." };
  }

  await createSession(user.id);
  await audit({
    actorUserId: user.id,
    action: "auth.password_login",
    entityType: "user",
    entityId: user.id,
  });
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Use at least 8 characters."),
});

/**
 * Self-serve affiliate signup: creates (or links) a user, sets a password,
 * and issues a unique referral code, then logs them in.
 */
export async function affiliateSignup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const { name, email, password } = parsed.data;

  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user) {
    // Existing account: only allow if it has no password yet (e.g. created at
    // checkout). Otherwise send them to login to avoid takeover.
    if (user.passwordHash) {
      return { error: "That email already has an account. Please log in." };
    }
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password), name: user.name ?? name })
      .where(eq(users.id, user.id));
  } else {
    [user] = await db
      .insert(users)
      .values({ email, name, passwordHash: hashPassword(password) })
      .returning();
  }

  // Coaches (approved partners) already have a referral code; don't issue a
  // second affiliate code. They just get a password + dashboard access.
  const isPartner = await db.query.partners.findFirst({
    where: eq(partners.userId, user.id),
  });
  const existingAffiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.userId, user.id),
  });
  if (!existingAffiliate && !isPartner) {
    let code = generateReferralCode();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await db.insert(affiliates).values({ userId: user.id, code });
        break;
      } catch {
        if (attempt === 2) return { error: "Something went wrong. Try again." };
        code = generateReferralCode();
      }
    }
  }

  await createSession(user.id);
  await audit({
    actorUserId: user.id,
    action: "affiliate.signup",
    entityType: "user",
    entityId: user.id,
  });
  redirect("/dashboard");
}
