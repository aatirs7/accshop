import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pay with Zelle" };

export default async function ZelleInstructionsPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderCode, orderCode.toUpperCase()),
    with: { product: true },
  });
  if (!order || order.paymentMethod !== "zelle") notFound();

  if (order.paymentStatus === "paid") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-brand-gold/40 bg-card/70 p-10 text-center">
          <p className="font-display text-2xl text-brand-gold">
            Payment confirmed ✓
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Order {order.orderCode} is paid and now being fulfilled. Track it
            in your dashboard.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (order.paymentStatus !== "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card/70 p-10 text-center">
          <p className="font-display text-2xl">Order {order.paymentStatus}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            This order is no longer awaiting payment.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/accounts">Start a new order</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-atmosphere min-h-screen">
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Final step
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            Send your Zelle payment
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {order.quantity}× {order.product.name}
          </p>

          <dl className="mt-8 space-y-5">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Amount
              </dt>
              <dd className="font-display text-4xl text-brand-gold">
                {formatMoney(order.totalCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Send to
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {env.ZELLE_RECIPIENT_NAME}
              </dd>
              <dd className="font-mono text-sm text-muted-foreground">
                {env.ZELLE_RECIPIENT_HANDLE}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Memo, required
              </dt>
              <dd className="mt-2 inline-block rounded-lg border border-brand-gold/40 bg-background px-5 py-3 font-mono text-2xl tracking-[0.15em] text-brand-gold">
                {order.orderCode}
              </dd>
              <dd className="mt-2 text-xs text-muted-foreground">
                Put this code in the Zelle memo so we can match your payment
                instantly.
              </dd>
            </div>
          </dl>

          <div className="gold-hairline my-8" />

          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Open your banking app and choose Zelle.</li>
            <li>2. Send the exact amount with the memo code above.</li>
            <li>
              3. We confirm manually, usually within a few hours. You&apos;ll
              get an email the moment it&apos;s confirmed.
            </li>
          </ol>

          <p className="mt-6 text-xs text-muted-foreground">
            These instructions were also emailed to you. Your order is held for
            48 hours.
          </p>
        </div>
      </div>
    </main>
  );
}
