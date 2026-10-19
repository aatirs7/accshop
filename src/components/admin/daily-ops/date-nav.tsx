"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDayKey, localToday, shiftDay, prettyDay, relativeDay } from "@/lib/daily-ops";

/**
 * Date selector for the workspace: a calendar input plus prev/next arrows and a
 * "Today" jump. Drives everything on the page through the `?date=` query param.
 * When no valid date is in the URL it redirects to the viewer's *local* today
 * (the server can't know the viewer's timezone).
 */
export function DateNav({ date }: { date: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isDayKey(date)) {
      router.replace(`/admin/daily-operations?date=${localToday()}`);
    }
  }, [date, router]);

  if (!isDayKey(date)) {
    return <div className="h-10" aria-hidden />;
  }

  const go = (next: string) =>
    startTransition(() => router.push(`/admin/daily-operations?date=${next}`));

  const today = localToday();
  const rel = relativeDay(date, today);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 p-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous day"
        disabled={pending}
        onClick={() => go(shiftDay(date, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="relative">
        <Input
          type="date"
          value={date}
          disabled={pending}
          onChange={(e) => {
            if (isDayKey(e.target.value)) go(e.target.value);
          }}
          className="w-[11rem]"
          aria-label="Select date"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next day"
        disabled={pending}
        onClick={() => go(shiftDay(date, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="ml-1 min-w-0">
        <p className="truncate text-sm font-medium">{prettyDay(date)}</p>
        {rel && <p className="text-xs text-brand-gold">{rel}</p>}
      </div>

      {date !== today && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={pending}
          onClick={() => go(today)}
        >
          Jump to today
        </Button>
      )}
    </div>
  );
}
