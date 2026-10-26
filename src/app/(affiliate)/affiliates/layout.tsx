import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requireAffiliate, needsProfile } from "@/lib/affiliates/auth";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata = { title: "Affiliate dashboard" };

const NAV = [
  { href: "/affiliates/dashboard", label: "Dashboard" },
  { href: "/affiliates/live", label: "LIVE reports" },
  { href: "/affiliates/settings", label: "Settings" },
];

/**
 * Shell for the signed-in affiliate area (/affiliates/dashboard, /live,
 * /settings). requireAffiliate() sends anyone else to login or join.
 */
export default async function AffiliateAppLayout({ children }: { children: React.ReactNode }) {
  const { user, affiliate } = await requireAffiliate();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/affiliates" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="font-display text-lg font-bold tracking-[0.25em] text-brand-gold">
              ACCSHOP
            </Link>
            <nav className="flex gap-4 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap text-muted-foreground hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {affiliate.username ? `@${affiliate.username}` : user.email}
            </span>
            <form action={doSignOut}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {affiliate.status !== "active" && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm">
          Your affiliate account is {affiliate.status}. Your code won&apos;t earn commission right now. Contact
          ACCSHOP support if you think this is a mistake.
        </div>
      )}
      {affiliate.status === "active" && needsProfile(affiliate) && (
        <div className="border-b border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-center text-sm">
          Finish your profile so we can pay you.{" "}
          <Link href="/affiliates/settings" className="font-medium text-brand-gold underline">
            Add your username and payout details
          </Link>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
