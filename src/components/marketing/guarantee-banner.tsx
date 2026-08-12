import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GuaranteeBanner() {
  return (
    <section className="border-y border-brand-gold/25 bg-atmosphere">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <span className="text-4xl">🛡️</span>
        <h2 className="mt-4 font-display text-3xl font-medium sm:text-4xl">
          Risk-free purchase guarantee
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground text-balance">
          Every account is covered by a 30-day replacement warranty. If it's
          banned, restricted from TikTok Shop Affiliate, or not as described, we
          replace it, no questions, no runaround.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/warranty">Read the warranty policy</Link>
        </Button>
      </div>
    </section>
  );
}
