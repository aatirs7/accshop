import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Refund & Replacement Policy" };

const sections = [
  {
    title: "Replacements come first",
    body: "Every order includes a 14-day replacement warranty starting the moment your credentials are delivered by email. If your account is banned, restricted from TikTok Shop Affiliate, or its follower count was materially misrepresented, file a claim from your dashboard and we'll replace it free of charge. Full coverage details are on our warranty page.",
  },
  {
    title: "When a refund applies instead",
    body: "Refunds are handled case by case, and are typically issued when we can't source a replacement account, if you were charged twice for the same order, or if your order is cancelled before your account has been delivered. Contact support and we'll confirm which option applies to your order.",
  },
  {
    title: "Before delivery",
    body: "If you change your mind before your account has been delivered, contact us as soon as possible. If sourcing hasn't started, we'll cancel and refund the order in full.",
  },
  {
    title: "What isn't covered",
    body: "Once credentials are delivered, refunds aren't offered for issues caused after handover, such as skipping the warmup guide, running prohibited content, or sharing your credentials with a third party. These situations are outlined in full on our warranty page.",
  },
  {
    title: "How to request one",
    body: "Open your order in the dashboard and file a claim, or email support with your order code. We review requests within 24-48 hours and let you know the outcome directly.",
  },
  {
    title: "Processing time",
    body: "Approved refunds are returned to your original payment method and typically show up within 5-10 business days, depending on your bank or card issuer.",
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Refund & Replacement Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
            Exactly what happens if something goes wrong with your order.
          </p>
        </div>
        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-2xl text-brand-gold">
                {s.title}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </section>
          ))}
        </div>
        <div className="gold-hairline my-12" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/warranty">Read the full warranty policy</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Or email{" "}
          <a
            href={`mailto:${env.SUPPORT_EMAIL}`}
            className="text-brand-gold underline"
          >
            {env.SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
