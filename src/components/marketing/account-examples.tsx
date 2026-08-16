const EXAMPLES = [
  "/examples/example-1.png",
  "/examples/example-2.jpeg",
  "/examples/example-3.jpeg",
  "/examples/example-4.jpeg",
  "/examples/example-5.jpeg",
];

/**
 * Real screenshots of delivered accounts, auto-scrolling the same way the
 * trust ticker under the header does.
 */
export function AccountExamples() {
  const loop = [...EXAMPLES, ...EXAMPLES];

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
          See before you buy
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
          What an account looks like
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground text-balance sm:mx-0">
          Real screenshots from accounts we&apos;ve delivered — established
          profiles, real followers, TikTok Shop ready from day one.
        </p>
      </div>

      <div className="mt-10 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-6">
          {loop.map((src, i) => (
            <div
              key={i}
              className="relative aspect-[9/19.5] w-[220px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-brand-raised"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Example of a delivered TikTok account"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
