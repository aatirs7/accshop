"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { timeAgo } from "@/lib/admin/dopamine";
import type { RecentSale } from "@/lib/db/queries/reporting";
import { cn } from "@/lib/utils";
import { useNow } from "./hooks";

/** The latest wins, newest first, each one a link into the order. */
export function RecentSales({ sales }: { sales: RecentSale[] }) {
  const now = useNow();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Latest wins
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            new sales slide in here as they land
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No paid orders yet. Your first cha-ching will show up right here.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {sales.map((s, i) => (
              <li
                key={s.orderCode}
                className={cn("animate-rise-in", i === 0 && "rounded-md bg-brand-gold/5")}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Link
                  href={`/admin/orders/${s.orderCode}`}
                  className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      i === 0
                        ? "bg-brand-gold/20 text-brand-gold shadow-[0_0_16px_-4px_var(--brand-gold)]"
                        : "bg-brand-gold/10 text-brand-gold-dim",
                    )}
                  >
                    <Coins className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-lg text-brand-gold">
                        {formatMoney(s.totalCents)}
                      </span>
                      <span className="truncate text-sm">
                        {s.quantity}× {s.productName}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.customer} · {s.orderCode}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="capitalize">
                      {s.method}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {now === null ? "" : timeAgo(s.paidAt, now)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
