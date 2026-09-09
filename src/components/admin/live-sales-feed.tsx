"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

export interface FeedItem {
  id: string;
  orderCode: string;
  totalCents: number;
  quantity: number;
  productName: string;
  customerName: string | null;
  customerEmail: string;
  paymentMethod: "stripe" | "zelle";
  paidAt: string; // ISO
}

function relative(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Most recent paid orders with a live "x minutes ago" clock. */
export function LiveSalesFeed({ sales }: { sales: FeedItem[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (sales.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sales yet. The first one will ring the bell right here.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {sales.map((s, i) => {
        const fresh = now - new Date(s.paidAt).getTime() < 3_600_000;
        return (
          <li key={s.id}>
            <Link
              href={`/admin/orders/${s.orderCode}`}
              className={[
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent",
                i === 0 && fresh
                  ? "sale-fresh border-brand-gold/40 bg-brand-gold/5"
                  : "border-border/60",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {s.customerName ?? s.customerEmail}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.quantity}× {s.productName} · {s.paymentMethod} · {s.orderCode}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-lg text-brand-gold">
                  +{formatMoney(s.totalCents)}
                </p>
                <p className="text-xs text-muted-foreground">{relative(s.paidAt, now)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
