"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

/**
 * Number that rolls up to its value on mount and rolls again whenever the
 * value changes (e.g. right after a new sale refreshes the page). Renders
 * the final value on the server so there's no layout shift.
 */
export function CountUp({
  value,
  money = false,
  duration = 1400,
  className,
}: {
  value: number;
  money?: boolean;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = previous.current ?? 0;
    previous.current = value;
    if (reduce || from === value) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const current = from + (value - from) * eased;
      setDisplay(t < 1 ? (money ? Math.round(current / 100) * 100 : Math.round(current)) : value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, money]);

  return (
    <span className={className}>
      {money ? formatMoney(display) : display.toLocaleString("en-US")}
    </span>
  );
}
