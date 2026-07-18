import { Badge } from "@/components/ui/badge";
import {
  pipelineStage,
  warrantyState,
  type FulfillmentStatus,
} from "@/lib/orders/status";
import { formatDate } from "@/lib/format";

export function StageBadge({
  order,
}: {
  order: {
    paymentStatus: string;
    fulfillmentStatus: FulfillmentStatus;
    deliveredAt: Date | null;
  };
}) {
  const stage = pipelineStage(order);
  const tone =
    stage.key === "warranty_active"
      ? "border-brand-success/50 text-brand-success"
      : stage.key === "cancelled" || stage.key === "refunded"
        ? "border-destructive/50 text-destructive"
        : stage.key === "awaiting_payment"
          ? "border-brand-warning/50 text-brand-warning"
          : "border-brand-gold/40 text-brand-gold";
  return (
    <Badge variant="outline" className={tone}>
      {stage.label}
    </Badge>
  );
}

export function WarrantyBadge({ deliveredAt }: { deliveredAt: Date | null }) {
  const w = warrantyState(deliveredAt);
  if (w.status === "not_started") {
    return (
      <span className="text-xs text-muted-foreground">
        Warranty starts at delivery
      </span>
    );
  }
  if (w.status === "active") {
    return (
      <span className="text-xs font-medium text-brand-success">
        Warranty: {w.daysLeft} day{w.daysLeft === 1 ? "" : "s"} left (until{" "}
        {formatDate(w.expiresAt)})
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      Warranty expired {formatDate(w.expiredAt)}
    </span>
  );
}
