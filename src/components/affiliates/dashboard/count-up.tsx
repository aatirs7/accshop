"use client";

import { useLayoutEffect, useRef } from "react";
import { formatMoney } from "@/lib/format";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * A money figure that counts up from zero on mount. The server renders the
 * final value, so no-JS visitors, screen readers and reduced-motion users all
 * get the real number; the animation only rewrites the visible text.
 */
export function CountUpMoney({
  cents,
  durationMs = 1600,
  className,
}: {
  cents: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || cents <= 0 || prefersReducedMotion()) return;
    // Animate whole dollars so the number doesn't flicker through cents.
    const targetDollars = Math.round(cents / 100);
    let frame = 0;
    const start = performance.now();
    el.textContent = formatMoney(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t >= 1 ? formatMoney(cents) : formatMoney(Math.round(targetDollars * eased) * 100);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = formatMoney(cents);
    };
  }, [cents, durationMs]);

  return (
    <span className={className}>
      <span className="sr-only">{formatMoney(cents)}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {formatMoney(cents)}
      </span>
    </span>
  );
}
