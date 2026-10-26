import { CheckCircle2, Clock, Hourglass, Link2, Undo2, Wallet } from "lucide-react";
import type { CommissionRow } from "@/lib/affiliates/stats";
import {
  AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS,
  type AffiliateCommissionStatus,
} from "@/lib/affiliates/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS: Record<
  AffiliateCommissionStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Pending", className: "border-brand-warning/50 text-brand-warning", icon: Hourglass },
  approved: { label: "Approved", className: "border-brand-gold/50 text-brand-gold", icon: CheckCircle2 },
  paid: { label: "Paid", className: "border-brand-success/50 text-brand-success", icon: Wallet },
  reversed: { label: "Reversed", className: "border-destructive/50 text-destructive", icon: Undo2 },
};

export function CommissionStatusBadge({ status }: { status: AffiliateCommissionStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={s.className}>
      <Icon className="size-3" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

function statusNote(c: CommissionRow): string {
  if (c.status === "paid" && c.paidAt) return `Paid ${formatDate(c.paidAt)}`;
  if (c.status === "approved") return c.approvedAt ? `Approved ${formatDate(c.approvedAt)}, awaiting payout` : "Awaiting payout";
  if (c.status === "pending") return "Pending review";
  if (c.status === "reversed") {
    const when = c.reversedAt ? ` ${formatDate(c.reversedAt)}` : "";
    return c.reversalReason ? `Reversed${when}: ${c.reversalReason}` : `Reversed${when}`;
  }
  return "";
}

/** Every sale credited to the affiliate, newest first. */
export function CommissionHistory({
  commissions,
  canEarn,
}: {
  commissions: CommissionRow[];
  canEarn: boolean;
}) {
  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="history-heading" className="font-display text-xl font-medium">
            Sales and commission
          </h2>
          <p className="text-sm text-muted-foreground">
            {canEarn
              ? "Every order placed with your code, newest first."
              : "Your past sales are below. New sales won't earn commission while your account is paused."}
          </p>
        </div>
        {commissions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {commissions.length} {commissions.length === 1 ? "order" : "orders"}
          </p>
        )}
      </div>

      {commissions.length === 0 ? (
        <Card className="border border-dashed border-brand-gold/30 bg-transparent ring-0">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
              <Link2 className="size-6" aria-hidden="true" />
            </span>
            <p className="font-display text-lg">No sales yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Share your link on your LIVEs, in your bio and in DMs. Every account someone buys with your code
              earns you {formatMoney(AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS)}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {commissions.map((c) => {
            const reversed = c.status === "reversed";
            return (
              <li
                key={c.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-card px-4 py-3",
                  reversed && "opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.productName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{c.orderCode}</span>
                      <span aria-hidden="true"> · </span>
                      {c.quantity} {c.quantity === 1 ? "account" : "accounts"}
                      <span aria-hidden="true"> · </span>
                      {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-display text-lg tabular-nums",
                        reversed ? "text-muted-foreground line-through" : "text-brand-gold",
                      )}
                    >
                      +{formatMoney(c.amountCents)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CommissionStatusBadge status={c.status} />
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      reversed ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {!reversed && c.status === "pending" && <Clock className="size-3" aria-hidden="true" />}
                    {statusNote(c)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
