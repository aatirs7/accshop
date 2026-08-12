import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const catalog = await db.query.products.findMany({
    where: eq(products.active, true),
    orderBy: asc(products.sort),
  });

  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Catalog
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Choose your tier
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
            Every account is affiliate-eligible, sourced for low ban risk, and
            covered by our 30-day replacement warranty.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {catalog.map((p) => (
            <Card
              key={p.id}
              className="group relative w-full max-w-sm overflow-hidden border-border/60 transition-colors hover:border-brand-gold/50"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-brand-gold/40 text-brand-gold"
                  >
                    {p.tierLabel} tier
                  </Badge>
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-2xl text-brand-gold">
                      {formatMoney(p.retailPriceCents)}
                    </span>
                    {p.compareAtPriceCents &&
                      p.compareAtPriceCents > p.retailPriceCents && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatMoney(p.compareAtPriceCents)}
                        </span>
                      )}
                  </span>
                </div>
                <CardTitle className="mt-3 font-display text-2xl font-medium">
                  {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    `${p.followerMin.toLocaleString()}+ real followers`,
                    "TikTok Shop Affiliate eligible",
                    "Encrypted credential delivery",
                    "Warmup guide included",
                    "30-day replacement warranty",
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-gold">✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full">
                  <Link href={`/accounts/${p.slug}`}>View &amp; buy</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
          <h2 className="font-display text-2xl">Need 10+ accounts?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Mentors and programs get wholesale pricing with a dedicated weekly
            pipeline.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/bulk">Request bulk pricing</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
