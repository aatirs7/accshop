"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

export interface DayBar {
  day: string; // YYYY-MM-DD
  label: string; // e.g. "Mon 9"
  revenueCents: number;
  orderCount: number;
  isToday: boolean;
}

/**
 * Two-week revenue column chart. One series (brand gold), so no legend; hover
 * a column for the exact figure. Bars rise from the baseline on mount.
 */
export function RevenueBars({ days }: { days: DayBar[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.revenueCents));
  const shown = active ?? days.length - 1;
  const focus = days[shown];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm">
          <span className="font-display text-2xl text-brand-gold">
            {formatMoney(focus.revenueCents)}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {focus.isToday ? "today" : focus.label} · {focus.orderCount}{" "}
            {focus.orderCount === 1 ? "order" : "orders"}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatMoney(days.reduce((s, d) => s + d.revenueCents, 0))} in 14 days
        </p>
      </div>
      <div
        className="flex h-36 items-end gap-[2px]"
        onMouseLeave={() => setActive(null)}
        role="img"
        aria-label="Revenue per day, last 14 days"
      >
        {days.map((d, i) => {
          const pct = (d.revenueCents / max) * 100;
          const isActive = i === shown;
          return (
            <button
              key={d.day}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group flex h-full flex-1 cursor-default flex-col justify-end outline-none"
              aria-label={`${d.label}: ${formatMoney(d.revenueCents)}, ${d.orderCount} orders`}
            >
              <div className="flex h-full items-end justify-center">
                <div
                  className={[
                    "revenue-bar w-full max-w-6 rounded-t-[4px] transition-colors",
                    isActive ? "bg-brand-gold" : "bg-brand-gold/55 group-hover:bg-brand-gold/80",
                    d.revenueCents === 0 ? "min-h-[2px] bg-border" : "",
                  ].join(" ")}
                  style={{ height: `${Math.max(pct, d.revenueCents ? 4 : 0)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted-foreground">
        {days.map((d, i) => (
          <span key={d.day} className="flex-1 truncate text-center">
            {d.isToday ? "Today" : (days.length - 1 - i) % 2 === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
