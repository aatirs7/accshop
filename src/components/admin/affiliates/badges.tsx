import { Badge } from "@/components/ui/badge";

const AFFILIATE_TONE: Record<string, string> = {
  active: "border-brand-success/50 text-brand-success",
  suspended: "border-brand-warning/50 text-brand-warning",
  deactivated: "border-destructive/50 text-destructive",
};

export function AffiliateStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`capitalize ${AFFILIATE_TONE[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

const COMMISSION_TONE: Record<string, string> = {
  pending: "border-brand-warning/50 text-brand-warning",
  approved: "border-brand-gold/40 text-brand-gold",
  paid: "border-brand-success/50 text-brand-success",
  reversed: "border-destructive/50 text-destructive",
};

export function CommissionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`capitalize ${COMMISSION_TONE[status] ?? ""}`}>
      {status}
    </Badge>
  );
}
