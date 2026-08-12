const benefits = [
  {
    icon: "🌱",
    title: "100% Organic Followers",
    body: "Real audiences built naturally. No bots, no purchased spam that gets flagged.",
  },
  {
    icon: "🔑",
    title: "Full Account Ownership",
    body: "Change the login, email, and every recovery detail from day one. It's entirely yours.",
  },
  {
    icon: "🛍️",
    title: "TikTok Shop Ready",
    body: "Affiliate program access is confirmed on every account before we deliver it.",
  },
  {
    icon: "🛡️",
    title: "30-Day Replacement Warranty",
    body: "Every account is covered for a full month, with a live countdown in your dashboard.",
  },
];

export function BenefitGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
          Why our accounts are better
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
          Account benefits
        </h2>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-gold/10 text-2xl">
              {b.icon}
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">
              {b.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {b.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
