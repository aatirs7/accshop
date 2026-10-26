import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "gold",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "gold" | "warning" | "success" | "muted";
}) {
  const toneClass = {
    gold: "text-brand-gold bg-brand-gold/10",
    warning: "text-brand-warning bg-brand-warning/10",
    success: "text-brand-success bg-brand-success/10",
    muted: "text-muted-foreground bg-muted",
  }[tone];
  return (
    <Card size="sm" className="transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 items-center justify-center rounded-lg", toneClass)}>{icon}</span>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        <p className="font-display text-2xl tabular-nums sm:text-3xl">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
