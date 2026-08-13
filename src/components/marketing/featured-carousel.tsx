"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

export interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  tierLabel: string;
  description: string;
  retailPriceCents: number;
  compareAtPriceCents: number | null;
  screenshotUrl: string | null;
}

export function FeaturedCarousel({
  products,
}: {
  products: FeaturedProduct[];
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            In stock now
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
            Featured accounts
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label="Previous"
            onClick={() => scroll(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 transition-colors hover:border-brand-gold/50"
          >
            ←
          </button>
          <button
            aria-label="Next"
            onClick={() => scroll(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 transition-colors hover:border-brand-gold/50"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <article
            key={p.id}
            className="relative w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-card/60 transition-colors hover:border-brand-gold/50"
          >
            {/* Phone-mockup image / placeholder */}
            <div className="relative aspect-[4/5] overflow-hidden bg-brand-raised">
              {p.screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.screenshotUrl}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-atmosphere flex h-full w-full flex-col items-center justify-center">
                  <span className="font-display text-5xl text-brand-gold/40">
                    {p.tierLabel}
                  </span>
                  <span className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                    followers
                  </span>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="font-display text-2xl text-brand-gold">
                  {formatMoney(p.retailPriceCents)}
                </span>
                {p.compareAtPriceCents && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(p.compareAtPriceCents)}
                  </span>
                )}
              </div>
              <Button asChild className="mt-4 w-full">
                <Link href={`/accounts/${p.slug}`}>View account</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
