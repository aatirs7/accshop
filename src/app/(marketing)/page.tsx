export const dynamic = "force-dynamic";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, testimonials } from "@/lib/db/schema";
import { socialProof } from "@/lib/db/queries/public";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { StatPills } from "@/components/marketing/stat-pills";
import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { GuaranteeBanner } from "@/components/marketing/guarantee-banner";
import { FeaturedCarousel } from "@/components/marketing/featured-carousel";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";

export default async function HomePage() {
  const [catalog, featuredProducts, featured, proof] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.active, true),
      orderBy: asc(products.sort),
    }),
    db.query.products.findMany({
      where: and(eq(products.active, true), eq(products.featured, true)),
      orderBy: asc(products.sort),
    }),
    db.query.testimonials.findMany({
      where: eq(testimonials.published, true),
      orderBy: asc(testimonials.sort),
      limit: 8,
    }),
    socialProof(),
  ]);
  const flagship = catalog[0];

  return (
    <main>
      {/* Hero */}
      <section className="bg-atmosphere relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
          <Badge
            variant="outline"
            className="border-brand-gold/40 text-brand-gold"
          >
            Trusted by TikTok Shop mentors &amp; their students
          </Badge>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[1.05] text-balance sm:text-7xl">
            Established TikTok Affiliate accounts,{" "}
            <em className="text-brand-gold">ready to earn.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance">
            100K+ follower accounts sourced for low ban risk, delivered fast,
            and backed by a 14-day replacement warranty on every order.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full px-9 text-base font-semibold shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-gold/30"
            >
              <Link href={flagship ? `/accounts/${flagship.slug}` : "/accounts"}>
                Buy an account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/partners">Buying for your students?</Link>
            </Button>
          </div>
          {/* Trust-stat pills */}
          <div className="mt-10">
            <StatPills accountsSold={proof.accountsSold} />
          </div>
          {/* Trust bar */}
          <dl className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-8">
            {[
              ["100K+", "followers per account"],
              ["14-day", "replacement warranty"],
              ["1-5 hrs", "average delivery"],
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

      {/* Featured accounts carousel */}
      {featuredProducts.length > 0 && (
        <FeaturedCarousel
          products={featuredProducts.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            tierLabel: p.tierLabel,
            description: p.description,
            retailPriceCents: p.retailPriceCents,
            compareAtPriceCents: p.compareAtPriceCents,
            screenshotUrl: p.screenshotUrl,
          }))}
        />
      )}

      {/* Account benefits */}
      <BenefitGrid />

      {/* Risk-free guarantee */}
      <GuaranteeBanner />

      {/* Testimonials carousel */}
      {featured.length > 0 && (
        <TestimonialsCarousel
          testimonials={featured.map((t) => ({
            id: t.id,
            authorName: t.authorName,
            authorHandle: t.authorHandle,
            headline: t.headline,
            content: t.content,
            rating: t.rating,
          }))}
        />
      )}
      <div className="mb-4 text-center">
        <Button asChild variant="outline">
          <Link href="/testimonials">Read all testimonials →</Link>
        </Button>
      </div>

      {/* Process */}
      <section className="border-y border-border/60 bg-brand-raised/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
              How it works
            </p>
            <h2 className="mx-auto mt-2 max-w-lg font-display text-3xl font-medium sm:text-4xl">
              From checkout to posting in four steps
            </h2>
          </div>
          <div className="mt-12">
            <ProcessSteps />
          </div>
        </div>
      </section>

      {/* Partner teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="bg-atmosphere overflow-hidden rounded-2xl border border-brand-gold/25 p-10 text-center sm:p-14">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
              Coach &amp; mentor program
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              Supply your whole mentorship program
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground text-balance">
              Wholesale pricing from 10 accounts, referral commissions when your
              students buy direct, and a dedicated pipeline for weekly bulk
              orders. Applications reviewed personally.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
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
