import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/** Authoritative auth check for customer pages and server actions. */
export async function requireUser(): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Authoritative admin check. 404s rather than 403s so the admin panel's
 * existence isn't advertised to non-admins.
 */
export async function requireAdmin(): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") notFound();
  return session.user;
}
