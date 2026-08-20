import type { ReactNode } from "react";

/**
 * Duplicates children and scrolls them sideways forever via .animate-marquee
 * (same animation as the trust ticker and account examples sections).
 */
export function MarqueeRow<T>({
  items,
  keyFor,
  renderItem,
}: {
  items: T[];
  keyFor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden">
      <div className="flex w-max animate-marquee items-stretch gap-6">
        {loop.map((item, i) => (
          <div key={`${keyFor(item)}-${i}`} className="shrink-0">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
