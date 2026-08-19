import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className="font-display text-lg font-bold tracking-[0.25em] text-brand-gold">
            ACCSHOP
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Established TikTok Affiliate accounts, sourced for low ban risk and
            delivered securely, with a 14-day warranty on every order.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Shop</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/accounts">Accounts</Link></li>
            <li><Link className="hover:text-foreground" href="/testimonials">Testimonials</Link></li>
            <li><Link className="hover:text-foreground" href="/warranty">Warranty policy</Link></li>
            <li><Link className="hover:text-foreground" href="/refund-policy">Refund &amp; replacement policy</Link></li>
            <li><Link className="hover:text-foreground" href="/dashboard">My orders</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">For mentors</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/partners">Partner program</Link></li>
            <li><Link className="hover:text-foreground" href="/bulk">Bulk orders</Link></li>
            <li><Link className="hover:text-foreground" href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ACCSHOP. All rights reserved.</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link className="hover:text-foreground" href="/terms">Terms of Service</Link>
          <Link className="hover:text-foreground" href="/privacy">Privacy Policy</Link>
          <Link className="hover:text-foreground" href="/refund-policy">Refund policy</Link>
        </p>
      </div>
    </footer>
  );
}
