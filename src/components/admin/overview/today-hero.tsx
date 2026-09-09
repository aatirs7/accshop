"use client";

import { useEffect, useState } from "react";
import { Crown, Flame, Pencil, Sparkles, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/format";
import {
  bestDay,
  isRecordDay,
  saleStreak,
  todayTotal,
  type SalePoint,
} from "@/lib/admin/dopamine";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import { useDevicePref, useNow } from "./hooks";
import { burstConfetti } from "./confetti";

const GOAL_PREF = "accshop.dailyGoalCents";
// Two accounts at retail: a goal that's beatable on a normal day.
const DEFAULT_GOAL_CENTS = 110_000;

function greeting(hour: number) {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The page's headline: money made today (rolling up as it lands), progress
 * toward a daily goal the owner sets, the sale streak, the best day on
 * record, and a "record day" crown when today beats it.
 */
export function TodayHero({
  points,
  ownerName,
}: {
  points: SalePoint[];
  ownerName?: string | null;
}) {
  const now = useNow();
  const [goalPref, setGoalPref] = useDevicePref(GOAL_PREF, String(DEFAULT_GOAL_CENTS));
  const goalCents = Math.max(0, Number(goalPref)) || DEFAULT_GOAL_CENTS;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const today = now === null ? null : todayTotal(points, now);
  const streak = now === null ? 0 : saleStreak(points, now);
  const best = now === null ? null : bestDay(points);
  const record = now === null ? false : isRecordDay(points, now);
  const todayCents = today?.cents ?? 0;
  const pct = goalCents > 0 ? Math.min(1, todayCents / goalCents) : 0;
  const goalHit = today !== null && goalCents > 0 && todayCents >= goalCents;
  const firstName = ownerName?.split(" ")[0];

  // One confetti burst per day when the goal is crossed, remembered per
  // device so a reload doesn't re-celebrate.
  const todayKey = today?.key;
  useEffect(() => {
    if (!goalHit || !todayKey) return;
    const key = `accshop.goalHit.${todayKey}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      return;
    }
    // Fire-and-forget: the flag is already written, so a re-render must not
    // cancel the celebration it gates.
    window.setTimeout(() => {
      burstConfetti({ count: 220, duration: 4000 });
      toast.success("Daily goal smashed!", {
        description: `${formatMoney(todayCents)} today. Everything from here is gravy.`,
        duration: 8000,
      });
    }, 400);
  }, [goalHit, todayKey, todayCents]);

  function startEdit() {
    setDraft(String(Math.round(goalCents / 100)));
    setEditing(true);
  }

  function saveGoal() {
    const dollars = Number(draft.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error("Enter a goal in dollars, like 1100.");
      return;
    }
    setGoalPref(String(Math.round(dollars * 100)));
    setEditing(false);
    toast.success(`Daily goal set to ${formatMoney(Math.round(dollars * 100))}`);
  }

  // Ring geometry.
  const size = 150;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <Card
      className={cn(
        "bg-atmosphere ring-brand-gold/25",
        record && "ring-brand-gold/60 animate-record-glow",
      )}
    >
      <CardContent className="grid gap-6 py-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-brand-gold" />
            {now === null ? "Welcome back" : greeting(new Date(now).getHours())}
            {firstName ? `, ${firstName}` : ""}.
          </p>
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
            Made today
          </p>
          <p className="mt-1 font-display text-5xl leading-none sm:text-6xl">
            <CountUp value={todayCents} className="text-gold-shimmer" />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {today && today.orders > 0
              ? `${today.orders} ${today.orders === 1 ? "sale" : "sales"} · ${today.accounts} ${
                  today.accounts === 1 ? "account" : "accounts"
                } sold today`
              : "No sales yet today. The bell is ready."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {record && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/60 bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-brand-gold">
                <Crown className="size-3.5" />
                Record day. Best ever.
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                streak > 0
                  ? "border-brand-gold/30 bg-brand-gold/5"
                  : "border-border text-muted-foreground",
              )}
            >
              <Flame
                className={cn("size-3.5", streak > 0 ? "text-brand-warning" : "")}
              />
              {streak > 0
                ? `${streak}-day sale streak`
                : "Start a streak with a sale today"}
            </span>
            {best && !record && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/5 px-3 py-1 text-xs font-medium">
                <Trophy className="size-3.5 text-brand-gold" />
                Best day: {formatMoney(best.cents)} on {formatDate(new Date(best.start))}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 justify-self-center md:justify-self-end">
          <div className="relative" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label={`${Math.round(pct * 100)}% of today's ${formatMoney(goalCents)} goal`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--brand-gold)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
                style={{
                  filter: pct > 0 ? "drop-shadow(0 0 8px oklch(0.83 0.115 85 / 55%))" : undefined,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {goalHit ? (
                <Target className="size-6 text-brand-gold" />
              ) : (
                <span className="font-display text-2xl text-brand-gold">
                  {Math.round(pct * 100)}%
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {goalHit ? "Goal hit" : "of goal"}
              </span>
            </div>
          </div>

          {editing ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                saveGoal();
              }}
            >
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                autoFocus
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8 w-24"
                aria-label="Daily goal in dollars"
              />
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Daily goal {formatMoney(goalCents)}
              <Pencil className="size-3" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
