"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { affiliates, partners, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
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
  if (user.role === "admin") redirect("/admin");
  // Self-serve affiliates (not coaches) live under /affiliates now.
  const [aff, partner] = await Promise.all([
    db.query.affiliates.findFirst({ where: eq(affiliates.userId, user.id), columns: { id: true } }),
    db.query.partners.findFirst({ where: eq(partners.userId, user.id), columns: { id: true } }),
  ]);
  redirect(aff && !partner ? "/affiliates/dashboard" : "/dashboard");
}
