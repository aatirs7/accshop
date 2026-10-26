"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS } from "@/lib/affiliates/constants";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Seen {
  salesCount: number;
  lifetimeCents: number;
}

function storageKey(affiliateId: string) {
  return `accshop:aff:last-seen:${affiliateId}`;
}

function readSeen(affiliateId: string): Seen | null {
  try {
    const raw = window.localStorage.getItem(storageKey(affiliateId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Seen>;
    if (typeof v.salesCount !== "number" || !Number.isFinite(v.salesCount)) return null;
    return {
      salesCount: v.salesCount,
      lifetimeCents: typeof v.lifetimeCents === "number" ? v.lifetimeCents : 0,
    };
  } catch {
    return null;
  }
}

function writeSeen(affiliateId: string, seen: Seen) {
  try {
    window.localStorage.setItem(storageKey(affiliateId), JSON.stringify(seen));
  } catch {
    // Private mode or storage disabled: the celebration just won't fire.
  }
}

// Fixed positions so server and client markup never disagree.
const CONFETTI = [
  { left: "6%", delay: "0ms", tone: "bg-brand-gold" },
  { left: "16%", delay: "180ms", tone: "bg-brand-success" },
  { left: "27%", delay: "60ms", tone: "bg-brand-gold-dim" },
  { left: "39%", delay: "260ms", tone: "bg-brand-gold" },
  { left: "52%", delay: "120ms", tone: "bg-brand-success" },
  { left: "64%", delay: "320ms", tone: "bg-brand-gold" },
  { left: "75%", delay: "40ms", tone: "bg-brand-gold-dim" },
  { left: "86%", delay: "220ms", tone: "bg-brand-success" },
  { left: "94%", delay: "140ms", tone: "bg-brand-gold" },
];

/**
 * "New sale!" moment. Compares the current sale count with the one stored on
 * the affiliate's last visit; first visits only record the baseline.
 */
export function SaleCelebration({
  affiliateId,
  salesCount,
  lifetimeCents,
}: {
  affiliateId: string;
  salesCount: number;
  lifetimeCents: number;
}) {
  const [moment, setMoment] = useState<{ sales: number; cents: number } | null>(null);
  // Read the stored baseline once per mount so a re-run of the effect (dev
  // StrictMode, a refresh) still compares against the previous visit.
  const baseline = useRef<Seen | null | undefined>(undefined);

  useEffect(() => {
    if (baseline.current === undefined) baseline.current = readSeen(affiliateId);
    const prev = baseline.current;
    writeSeen(affiliateId, { salesCount, lifetimeCents });
    if (!prev || salesCount <= prev.salesCount) return;
    const sales = salesCount - prev.salesCount;
    const delta = lifetimeCents - prev.lifetimeCents;
    const cents = delta > 0 ? delta : sales * AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS;
    const show = requestAnimationFrame(() => setMoment({ sales, cents }));
    const hide = window.setTimeout(() => setMoment(null), 9000);
    return () => {
      cancelAnimationFrame(show);
      window.clearTimeout(hide);
    };
  }, [affiliateId, salesCount, lifetimeCents]);

  if (!moment) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mb-6 overflow-hidden rounded-2xl border border-brand-gold/50 bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-brand-success/15 px-5 py-5 text-center shadow-lg animate-in fade-in zoom-in-90 slide-in-from-top-4 duration-700 motion-reduce:animate-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            style={{ left: c.left, animationDelay: c.delay }}
            className={cn(
              "absolute top-2 size-2 rounded-sm animate-bounce motion-reduce:animate-none",
              i % 2 === 0 ? "rotate-12" : "-rotate-12",
              c.tone,
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMoment(null)}
        className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
      <div className="relative flex flex-col items-center gap-1">
        <PartyPopper className="size-8 text-brand-gold motion-safe:animate-pulse" aria-hidden="true" />
        <p className="font-display text-2xl font-semibold text-brand-gold sm:text-3xl">
          {moment.sales === 1 ? "New sale!" : `${moment.sales} new sales!`}{" "}
          <span className="text-brand-success">+{formatMoney(moment.cents)}</span>
        </p>
        <p className="text-sm text-muted-foreground">Someone just bought with your code. Keep it going.</p>
      </div>
    </div>
  );
}
