"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Progress track that fills from empty on mount. Server markup already has
 * the final width, so reduced-motion and no-JS show the real state.
 */
export function GoalBar({
  percent,
  hit,
  label,
}: {
  percent: number;
  hit: boolean;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = `${Math.max(0, Math.min(100, percent))}%`;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduce = false;
    }
    if (reduce) return;
    el.style.transition = "none";
    el.style.width = "0%";
    // Force a layout so the browser commits the empty state first.
    void el.offsetWidth;
    const frame = requestAnimationFrame(() => {
      el.style.transition = "";
      el.style.width = width;
    });
    return () => {
      cancelAnimationFrame(frame);
      el.style.transition = "";
      el.style.width = width;
    };
  }, [width]);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(100, percent)))}
      className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        ref={ref}
        style={{ width }}
        className={cn(
          "h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none",
          hit
            ? "bg-gradient-to-r from-brand-success/70 to-brand-success"
            : "bg-gradient-to-r from-brand-gold-dim to-brand-gold",
        )}
      />
    </div>
  );
}
