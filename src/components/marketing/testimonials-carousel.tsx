"use client";

import { useRef } from "react";
import type { TestimonialData } from "@/components/marketing/testimonial-card";
import { formatDate } from "@/lib/format";

export interface CarouselTestimonial extends TestimonialData {
  headline: string | null;
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <div className="text-brand-gold" aria-label={`${r} out of 5 stars`}>
      {"★".repeat(r)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - r)}</span>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialsCarousel({
  testimonials,
}: {
  testimonials: CarouselTestimonial[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Social proof
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
            Buyers who came back
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
        {testimonials.map((t) => (
          <figure
            key={t.id}
            className="flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60"
          >
            {t.imageUrl && (
              <div className="aspect-video w-full overflow-hidden bg-brand-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <Stars rating={t.rating} />
              {t.headline && (
                <figcaption className="mt-3 font-display text-lg font-semibold">
                  {t.headline}
                </figcaption>
              )}
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-foreground/90">
                &ldquo;{t.content}&rdquo;
              </blockquote>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold/15 text-sm font-semibold text-brand-gold">
                    {initials(t.authorName)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t.authorName}</p>
                    {t.authorHandle && (
                      <p className="text-xs text-muted-foreground">
                        {t.authorHandle}
                      </p>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(t.createdAt)}
                </p>
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
