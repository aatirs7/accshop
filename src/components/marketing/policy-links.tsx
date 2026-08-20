import Link from "next/link";

/** Minimal Terms/Privacy/Refund links for pages outside the main site footer. */
export function PolicyLinks() {
  return (
    <p className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <Link className="hover:text-foreground" href="/terms">
        Terms of Service
      </Link>
      <Link className="hover:text-foreground" href="/privacy">
        Privacy Policy
      </Link>
      <Link className="hover:text-foreground" href="/refund-policy">
        Refund policy
      </Link>
    </p>
  );
}
