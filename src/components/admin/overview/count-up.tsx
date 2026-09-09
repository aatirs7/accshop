"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

/**
 * A number that rolls up into place: from zero on first paint, then from
 * its previous value whenever the server sends a new one (e.g. right after
 * a sale refreshes the page). Money by default; pass `format` for counts.
 */
export function CountUp({
  value,
  format = formatMoney,
  duration = 1200,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  // Server and first client paint show the real value, so there's no
  // hydration mismatch; the animation only starts after mount.
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(false);
  const shownRef = useRef(value);
  const firstRun = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = firstRun.current ? 0 : shownRef.current;
    const isBump = !firstRun.current && value > shownRef.current;
    firstRun.current = false;
    const to = value;

    if (reduce || from === to) {
      const id = requestAnimationFrame(() => {
        shownRef.current = to;
        setShown(to);
      });
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    let bumpTimer = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const next = Math.round(from + (to - from) * easeOutCubic(p));
      shownRef.current = next;
      setShown(next);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else if (isBump) {
        setBump(true);
        bumpTimer = window.setTimeout(() => setBump(false), 900);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(bumpTimer);
    };
  }, [value, duration]);

  return (
    <span className={cn("inline-block tabular-nums", bump && "animate-stat-bump", className)}>
      {format(shown)}
    </span>
  );
}
