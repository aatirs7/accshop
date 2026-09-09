"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetricsPreset } from "@/lib/admin/metrics-range";

const PRESETS: { key: MetricsPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const DAY_MS = 86_400_000;

/** Local midnight for the given day, `offsetDays` days from today. */
function localDayStart(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** YYYY-MM-DD input value -> local midnight of that day. */
function dayToLocalDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function MetricsRangePicker({
  preset,
  fromDay,
  toDay,
}: {
  preset: MetricsPreset;
  fromDay?: string;
  toDay?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const [from, setFrom] = useState(fromDay ?? "");
  const [to, setTo] = useState(toDay ?? todayInputValue());
  const [error, setError] = useState<string | null>(null);

  function go(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    startTransition(() => router.push(qs ? `/admin?${qs}` : "/admin"));
  }

  function choose(key: MetricsPreset) {
    setError(null);
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    // Windows are whole local calendar days, ending after today, so
    // "Today" is the owner's day rather than the server's UTC day.
    const tomorrow = String(localDayStart(1).getTime());
    switch (key) {
      case "today":
        go({ range: key, from: String(localDayStart().getTime()), to: tomorrow });
        break;
      case "7d":
        go({ range: key, from: String(localDayStart(-6).getTime()), to: tomorrow });
        break;
      case "30d":
        go({ range: key, from: String(localDayStart(-29).getTime()), to: tomorrow });
        break;
      case "all":
        go({ range: key });
        break;
    }
  }

  function applyCustom() {
    if (!from || !to) {
      setError("Pick both a start and an end date.");
      return;
    }
    const start = dayToLocalDate(from);
    const end = dayToLocalDate(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Those dates don't look right.");
      return;
    }
    if (start > end) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError(null);
    go({
      range: "custom",
      from: String(start.getTime()),
      // `to` is exclusive, so include the whole end day.
      to: String(end.getTime() + DAY_MS),
      fromDay: from,
      toDay: to,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Metrics period">
        {PRESETS.map((p) => {
          const active =
            p.key === "custom" ? customOpen || preset === "custom" : preset === p.key && !customOpen;
          return (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              disabled={pending}
              onClick={() => choose(p.key)}
            >
              {p.label}
            </Button>
          );
        })}
      </div>

      {customOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div>
            <Label htmlFor="metrics-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="metrics-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-auto"
            />
          </div>
          <div>
            <Label htmlFor="metrics-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="metrics-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-auto"
            />
          </div>
          <Button type="button" size="sm" disabled={pending} onClick={applyCustom}>
            {pending ? "Loading…" : "Apply"}
          </Button>
          {error && <p className="basis-full text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
