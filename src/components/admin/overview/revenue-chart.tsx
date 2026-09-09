"use client";

import { formatDate, formatMoney } from "@/lib/format";
import { recentDays, type SalePoint } from "@/lib/admin/dopamine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNow } from "./hooks";

const DAYS = 14;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Two weeks of daily revenue as gold columns, today glowing at the end.
 * Buckets by the owner's local day after mount (same convention as the
 * range picker), so it fills in with a rise animation.
 */
export function RevenueChart({ points }: { points: SalePoint[] }) {
  const now = useNow();
  const days = now === null ? null : recentDays(points, DAYS, now);
  const max = days ? Math.max(0, ...days.map((d) => d.cents)) : 0;
  const total = days ? days.reduce((s, d) => s + d.cents, 0) : 0;
  const bestIdx = days && max > 0 ? days.findIndex((d) => d.cents === max) : -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Last 14 days
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {days ? `${formatMoney(total)} in the last two weeks` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end gap-1.5 sm:gap-2" aria-hidden="true">
          {(days ?? Array.from({ length: DAYS }, () => null)).map((day, i) => {
            const isToday = i === DAYS - 1;
            const pct = day && max > 0 ? (day.cents / max) * 100 : 0;
            return (
              <div key={day?.key ?? i} className="group relative flex h-full flex-1 flex-col justify-end">
                {day && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                    <span className="font-medium text-brand-gold">{formatMoney(day.cents)}</span>
                    <span className="text-muted-foreground">
                      {" "}· {isToday ? "Today" : formatDate(new Date(day.start))}
                      {day.orders > 0 ? ` · ${day.orders} ${day.orders === 1 ? "sale" : "sales"}` : ""}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "mx-auto w-full max-w-6 rounded-t-[4px] transition-colors",
                    day && "animate-bar-rise",
                    isToday
                      ? "bg-brand-gold shadow-[0_0_20px_-2px_var(--brand-gold)]"
                      : i === bestIdx
                        ? "bg-brand-gold/85"
                        : "bg-brand-gold-dim/45 group-hover:bg-brand-gold-dim/70",
                  )}
                  style={{
                    height: `${Math.max(pct, day && day.cents > 0 ? 3 : 1)}%`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-2" aria-hidden="true">
          {(days ?? Array.from({ length: DAYS }, () => null)).map((day, i) => (
            <div
              key={day?.key ?? i}
              className={cn(
                "flex-1 text-center text-[10px] uppercase tracking-wider",
                i === DAYS - 1 ? "font-semibold text-brand-gold" : "text-muted-foreground",
              )}
            >
              {day ? (i === DAYS - 1 ? "Now" : WEEKDAY[new Date(day.start).getDay()]) : ""}
            </div>
          ))}
        </div>
        {days && (
          <table className="sr-only">
            <caption>Revenue per day, last {DAYS} days</caption>
            <thead>
              <tr>
                <th>Day</th>
                <th>Revenue</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <td>{formatDate(new Date(d.start))}</td>
                  <td>{formatMoney(d.cents)}</td>
                  <td>{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
