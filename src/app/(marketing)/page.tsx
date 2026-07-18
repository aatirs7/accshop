import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, testimonials } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { ProcessSteps } from "@/components/marketing/process-steps";

export default async function HomePage() {
  const [catalog, featured] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.active, true),
      orderBy: asc(products.sort),
    }),
    db.query.testimonials.findMany({
      where: eq(testimonials.published, true),
      orderBy: asc(testimonials.sort),
      limit: 3,
    }),
  ]);
  const flagship = catalog[0];

  return (
    <main>
      {/* Hero */}
      <section className="bg-atmosphere relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
          <Badge
            variant="outline"
            className="border-brand-gold/40 text-brand-gold"
          >
            Trusted by TikTok Shop mentors &amp; their students
          </Badge>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[1.05] text-balance sm:text-7xl">
            Established TikTok Affiliate accounts,{" "}
            <em className="text-brand-gold">delivered like a private client
            service.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            100K+ follower accounts sourced for low ban risk, encrypted
            credential delivery, and a 30-day replacement warranty on every
            single order.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href={flagship ? `/accounts/${flagship.slug}` : "/accounts"}>
                {flagship
                  ? `Get a 100K account — ${formatMoney(flagship.retailPriceCents)}`
                  : "Browse accounts"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/partners">Buying for your students?</Link>
            </Button>
          </div>
          {/* Trust bar */}
          <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-8">
            {[
              ["100K+", "followers per account"],
              ["30-day", "replacement warranty"],
              ["Encrypted", "credential delivery"],
            ].map(([stat, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl text-brand-gold sm:text-3xl">
                  {stat}
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="gold-hairline mx-auto max-w-6xl" />

      {/* Testimonials front and center */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
              Social proof
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
              Buyers who came back
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/testimonials">All testimonials →</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featured.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="border-y border-border/60 bg-brand-raised/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            How it works
          </p>
          <h2 className="mt-2 max-w-lg font-display text-3xl font-medium sm:text-4xl">
            From checkout to posting in four steps
          </h2>
          <div className="mt-12">
            <ProcessSteps />
          </div>
        </div>
      </section>

      {/* Partner teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="bg-atmosphere overflow-hidden rounded-2xl border border-brand-gold/25 p-10 sm:p-14">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
              Coach &amp; mentor program
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              Supply your whole mentorship program
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Wholesale pricing from 10 accounts, referral commissions when your
              students buy direct, and a dedicated pipeline for weekly bulk
              orders. Applications reviewed personally.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/partners">Apply for partner pricing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/bulk">One-off bulk order</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
