"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // Trim to forgive stray spaces added by mobile keyboards.
  password: z.string().trim().min(1),
});

const SESSION_DAYS = 30;

/**
 * Email + password sign-in for admins. Creates the same kind of database
 * session Auth.js uses (the cookie value is the session token), so `auth()`
 * recognizes it and magic-link login keeps working unchanged.
 */
export async function adminLogin(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password." };
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Uniform failure message; don't reveal which part was wrong.
  const fail = { error: "Incorrect email or password." };
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return fail;
  }
  if (user.role !== "admin") return fail;

  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    sessionToken: token,
    userId: user.id,
    expires: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });

  // Match Auth.js's cookie: secure + __Secure- prefix on HTTPS.
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

  await audit({
    actorUserId: user.id,
    action: "admin.password_login",
    entityType: "user",
    entityId: user.id,
  });

  redirect("/admin");
}
