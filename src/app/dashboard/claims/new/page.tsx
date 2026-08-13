import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { warrantyState } from "@/lib/orders/status";
import { WarrantyBadge } from "@/components/dashboard/status-badges";
import { ClaimForm } from "@/components/dashboard/claim-form";

export const metadata = { title: "File warranty claim" };

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ deliverable?: string }>;
}) {
  const user = await requireUser();
  const { deliverable: deliverableId } = await searchParams;
  if (!deliverableId) notFound();

  const deliverable = await db.query.deliverables.findFirst({
    where: eq(deliverables.id, deliverableId),
    with: { order: { with: { product: true } } },
  });
  if (!deliverable || deliverable.order.userId !== user.id) notFound();

  const warranty = warrantyState(deliverable.deliveredAt);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/dashboard/orders/${deliverable.order.orderCode}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to order
      </Link>
      <h1 className="mt-4 font-display text-3xl font-medium">
        Warranty claim
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Order {deliverable.order.orderCode} · {deliverable.order.product.name}
      </p>
      <div className="mt-2">
        <WarrantyBadge deliveredAt={deliverable.deliveredAt} />
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6">
        {warranty.status === "active" ? (
          <ClaimForm deliverableId={deliverable.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {warranty.status === "expired"
              ? "The 14-day warranty on this account has expired, so a claim can't be filed. If you believe this is an error, contact support."
              : "Warranty coverage begins once this account is delivered."}
          </p>
        )}
      </div>
    </div>
  );
}
