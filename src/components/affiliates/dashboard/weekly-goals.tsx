import { CheckCircle2, Clock, Radio, Trophy } from "lucide-react";
import { formatDuration } from "@/lib/affiliates/live";
import { Card, CardContent } from "@/components/ui/card";
import { GoalBar } from "./goal-bar";
import { shortDay } from "./format-day";

export interface WeekProgress {
  start: string;
  end: string;
  liveMinutes: number;
  liveSessions: number;
  hoursGoal: number;
  sessionsGoal: number;
}

function pct(value: number, goal: number): number {
  if (goal <= 0) return 100;
  return (value / goal) * 100;
}

function GoalRow({
  icon,
  title,
  current,
  target,
  percent,
  hit,
  remaining,
}: {
  icon: React.ReactNode;
  title: string;
  current: string;
  target: string;
  percent: number;
  hit: boolean;
  remaining: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {title}
        </div>
        <p className="text-sm">
          <span className="font-display text-xl text-foreground">{current}</span>
          <span className="text-muted-foreground"> / {target}</span>
        </p>
      </div>
      <GoalBar percent={percent} hit={hit} label={`${title}: ${current} of ${target}`} />
      <p className={hit ? "flex items-center gap-1 text-xs text-brand-success" : "text-xs text-muted-foreground"}>
        {hit ? (
          <>
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Goal hit
          </>
        ) : (
          remaining
        )}
      </p>
    </div>
  );
}

/** This week's LIVE hours and sessions against the affiliate's goals. */
export function WeeklyGoals({ week, title = "This week's LIVE goals" }: { week: WeekProgress; title?: string }) {
  const goalMinutes = week.hoursGoal * 60;
  const hoursHit = week.liveMinutes >= goalMinutes;
  const sessionsHit = week.liveSessions >= week.sessionsGoal;
  const allHit = hoursHit && sessionsHit;
  const minutesLeft = Math.max(0, goalMinutes - week.liveMinutes);
  const sessionsLeft = Math.max(0, week.sessionsGoal - week.liveSessions);

  return (
    <Card
      className={
        allHit
          ? "ring-brand-success/40 bg-gradient-to-br from-brand-success/10 via-card to-card"
          : "bg-gradient-to-br from-brand-gold/5 via-card to-card"
      }
    >
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-medium">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {shortDay(week.start)} to {shortDay(week.end)}
            </p>
          </div>
          {allHit && (
            <span className="inline-flex animate-in items-center gap-1.5 rounded-full border border-brand-success/40 bg-brand-success/10 px-3 py-1 text-xs font-medium text-brand-success zoom-in-90 fade-in duration-500 motion-reduce:animate-none">
              <Trophy className="size-3.5" aria-hidden="true" />
              Weekly goal hit
            </span>
          )}
        </div>
        <GoalRow
          icon={<Clock className="size-4" aria-hidden="true" />}
          title="LIVE hours"
          current={formatDuration(week.liveMinutes)}
          target={`${week.hoursGoal}h`}
          percent={pct(week.liveMinutes, goalMinutes)}
          hit={hoursHit}
          remaining={`${formatDuration(minutesLeft)} to go`}
        />
        <GoalRow
          icon={<Radio className="size-4" aria-hidden="true" />}
          title="LIVE sessions"
          current={String(week.liveSessions)}
          target={String(week.sessionsGoal)}
          percent={pct(week.liveSessions, week.sessionsGoal)}
          hit={sessionsHit}
          remaining={`${sessionsLeft} more ${sessionsLeft === 1 ? "session" : "sessions"} to go`}
        />
      </CardContent>
    </Card>
  );
}
