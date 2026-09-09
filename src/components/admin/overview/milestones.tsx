import { Award, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import {
  ACCOUNT_MILESTONES,
  REVENUE_MILESTONES,
  milestoneProgress,
} from "@/lib/admin/dopamine";
import { cn } from "@/lib/utils";

function compactMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${dollars / 1_000_000}M`;
  if (dollars >= 1_000) return `$${dollars / 1_000}K`;
  return formatMoney(cents);
}

function compactCount(n: number) {
  return n >= 1_000 ? `${n / 1_000}K` : String(n);
}

function Track({
  title,
  value,
  tiers,
  label,
  unit,
}: {
  title: string;
  value: number;
  tiers: number[];
  label: (n: number) => string;
  unit: string;
}) {
  const p = milestoneProgress(value, tiers);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {p.next === null
            ? "Every badge unlocked"
            : `${label(p.remaining)} ${unit} to ${label(p.next)}`}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-brand-gold-dim to-brand-gold shadow-[0_0_12px_-2px_var(--brand-gold)] transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.max(2, Math.round(p.progress * 100))}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tiers.map((t) => {
          const earned = value >= t;
          const next = t === p.next;
          return (
            <span
              key={t}
              title={earned ? `${label(t)} unlocked` : `${label(t)}: not yet`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                earned
                  ? "border-brand-gold/50 bg-brand-gold/15 text-brand-gold"
                  : next
                    ? "border-brand-gold/30 border-dashed text-foreground"
                    : "border-border text-muted-foreground/70",
              )}
            >
              {earned ? <Award className="size-3" /> : <Lock className="size-3" />}
              {label(t)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Badge wall: all-time revenue and accounts-sold tiers, with the next one in reach. */
export function Milestones({
  revenueCents,
  accountsSold,
}: {
  revenueCents: number;
  accountsSold: number;
}) {
  const earned =
    milestoneProgress(revenueCents, REVENUE_MILESTONES).reached.length +
    milestoneProgress(accountsSold, ACCOUNT_MILESTONES).reached.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Milestones
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {earned} of {REVENUE_MILESTONES.length + ACCOUNT_MILESTONES.length} badges unlocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Track
          title="Lifetime revenue"
          value={revenueCents}
          tiers={REVENUE_MILESTONES}
          label={compactMoney}
          unit="to go"
        />
        <Track
          title="Accounts sold"
          value={accountsSold}
          tiers={ACCOUNT_MILESTONES}
          label={compactCount}
          unit="more"
        />
      </CardContent>
    </Card>
  );
}
