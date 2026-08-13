import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/accounts", label: "Accounts" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/partners", label: "Partners" },
  { href: "/warranty", label: "Warranty" },
  { href: "/contact", label: "Contact" },
];

export async function SiteNav() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-[0.25em] text-brand-gold"
        >
          ACCSHOP
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {session.user.role === "admin" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Partner login</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/accounts">Browse accounts</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
