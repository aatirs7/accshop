import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Order status" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ oc?: string; cancelled?: string }>;
}) {
  const { oc, cancelled } = await searchParams;
  const order = oc
    ? await db.query.orders.findFirst({
        where: eq(orders.orderCode, oc.toUpperCase()),
      })
    : null;

  if (!order || cancelled) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card/70 p-10 text-center">
          <p className="font-display text-2xl">Checkout not completed</p>
          <p className="mt-3 text-sm text-muted-foreground">
            No payment was taken. You can try again whenever you&apos;re ready.
          </p>
          <Button asChild className="mt-6">
            <Link href="/accounts">Back to accounts</Link>
          </Button>
        </div>
      </main>
    );
  }

  const paid = order.paymentStatus === "paid";
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-brand-gold/40 bg-card/70 p-10 text-center">
        <p className="font-display text-3xl text-brand-gold">
          {paid ? "Payment confirmed ✓" : "Order received"}
        </p>
        <p className="mt-2 font-mono text-sm tracking-[0.15em] text-muted-foreground">
          {order.orderCode}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {paid
            ? "We're preparing your account now. Your login details will be emailed to you as soon as it's ready, usually within 24-72 hours."
            : "Once your Zelle payment is confirmed, we'll email your account details to you, usually within a few hours."}
        </p>
        <div className="mt-6 rounded-lg border border-border/60 bg-brand-raised/40 p-4 text-sm">
          <p className="font-medium">Questions about your order?</p>
          <p className="mt-1 text-muted-foreground">
            Email us anytime at{" "}
            <a
              href={`mailto:${env.SUPPORT_EMAIL}`}
              className="text-brand-gold underline"
            >
              {env.SUPPORT_EMAIL}
            </a>
          </p>
        </div>
        {order.paymentMethod === "zelle" && order.paymentStatus === "pending" && (
          <Button asChild className="mt-6">
            <Link href={`/checkout/zelle/${order.orderCode}`}>
              View Zelle payment details
            </Link>
          </Button>
        )}
      </div>
    </main>
  );
}
