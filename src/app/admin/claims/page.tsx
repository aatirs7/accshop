import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { warrantyClaims } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { warrantyState } from "@/lib/orders/status";
import { ClaimActions } from "@/components/admin/queue-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const statusTone: Record<string, string> = {
  open: "border-brand-warning/50 text-brand-warning",
  in_review: "border-brand-gold/40 text-brand-gold",
  replaced: "border-brand-success/50 text-brand-success",
  refunded: "border-brand-success/50 text-brand-success",
  denied: "border-destructive/50 text-destructive",
};

export default async function AdminClaimsPage() {
  const claims = await db.query.warrantyClaims.findMany({
    with: {
      order: { with: { product: true } },
      user: true,
      deliverable: true,
    },
    orderBy: desc(warrantyClaims.createdAt),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium">Warranty claims</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          &ldquo;Replace&rdquo; creates a fresh deliverable on the same order,
          source it and attach new credentials as usual.
        </p>
      </div>
      {claims.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No claims, long may it last.
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {claims.map((c) => {
          const w = warrantyState(c.deliverable.deliveredAt);
          return (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/orders/${c.order.orderCode}`}
                        className="font-mono text-brand-gold hover:underline"
                      >
                        {c.order.orderCode}
                      </Link>
                      <Badge variant="outline" className={statusTone[c.status]}>
                        {c.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {w.status === "active"
                          ? `warranty: ${w.daysLeft}d left`
                          : `warranty ${w.status.replace("_", " ")}`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.user.email} · {c.order.product.name} · filed{" "}
                      {formatDate(c.createdAt)}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm">{c.reason}</p>
                    {c.resolutionNotes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Resolution: {c.resolutionNotes}
                      </p>
                    )}
                  </div>
                  {(c.status === "open" || c.status === "in_review") && (
                    <ClaimActions claimId={c.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
