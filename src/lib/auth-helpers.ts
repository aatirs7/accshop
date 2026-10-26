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

/**
 * Gate for admin PAGES. The admin layout shows the sign-in form to non-admins,
 * but Next renders the page alongside the layout and ships its data in the
 * response, so a layout check alone leaks the page's data. Every admin page
 * calls this before loading anything. Non-admins go to /admin (sign-in form).
 */
export async function requireAdminPage(): Promise<Session["user"]> {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");
  return session.user;
}
