import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
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
            No payment was taken. Your cart is safe — you can try again
            whenever you&apos;re ready.
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
            ? "We're sourcing your account now. You'll get an email the moment your credentials are ready."
            : "Your payment is being confirmed — this page will reflect it shortly, and you'll get a confirmation email."}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Track everything from your dashboard — sign in with the email you
          used at checkout.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Open my dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
