const ICONS = ["✦", "✓", "★", "⚡", "◆", "✷"];

/**
 * Auto-scrolling marquee under the header on every page. The account count is
 * real (paid orders + configured baseline); the rest are static trust lines.
 */
export function TrustTicker({ accountsSold }: { accountsSold: number }) {
  const items = [
    `Loved by ${accountsSold.toLocaleString()}+ buyers`,
    "100% Organic Followers - No Bots",
    "TikTok Shop Ready",
    "Full Account Ownership",
    "30-Day Warranty on Every Account",
    "New Accounts Restocked Weekly",
  ];
  // Duplicated so the -50% translate loops seamlessly.
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-border/60 bg-brand-raised/50">
      <div className="flex w-max animate-marquee items-center gap-8 py-2.5">
        {loop.map((text, i) => (
          <span
            key={i}
            className="flex items-center gap-3 whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            <span className="text-brand-gold">{ICONS[i % ICONS.length]}</span>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
