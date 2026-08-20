import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Terms of Service" };

const sections = [
  {
    title: "The short version",
    body: "By placing an order on ACCSHOP you agree to these terms. If anything here is unclear, contact us before you buy.",
  },
  {
    title: "What you're buying",
    body: "You're purchasing ownership of an established TikTok account with TikTok Shop Affiliate access, sourced from our vetted supplier network. Once credentials are delivered, the account is yours: change the password right away. TikTok requires a 48-hour wait after your first login before you can update the recovery email and other recovery details, that's TikTok's own security rule, not ours.",
  },
  {
    title: "Payment",
    body: "Orders are paid by card (processed securely by Stripe) or Zelle. Card charges are captured at checkout; Zelle orders are held for 48 hours pending manual confirmation. Prices are set at the time of order.",
  },
  {
    title: "Delivery",
    body: "Credentials are emailed to the address you provided at checkout once your account has been sourced and verified, typically within the timeframe shown on your order status page. You're responsible for keeping your credentials secure after delivery.",
  },
  {
    title: "Acceptable use",
    body: "Accounts must be used in line with TikTok's own terms of service and community guidelines. We're not responsible for suspensions caused by content you post, prohibited activity, mass-following, or sharing your credentials with a third party after delivery.",
  },
  {
    title: "Warranty & refunds",
    body: "Every order includes a 14-day replacement warranty. Full details on what's covered, and when a refund instead of a replacement may apply, are in our warranty and refund policies.",
  },
  {
    title: "Limitation of liability",
    body: "ACCSHOP's liability for any order is limited to the amount you paid for that order. We're not liable for indirect losses, such as lost income from an account being suspended after delivery for reasons outside our control.",
  },
  {
    title: "Changes",
    body: "We may update these terms as the business evolves. Continued use of the site after a change means you accept the updated terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
            The rules that govern every order placed on ACCSHOP.
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
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Questions about these terms? Email{" "}
            <a
              href={`mailto:${env.SUPPORT_EMAIL}`}
              className="text-brand-gold underline"
            >
              {env.SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
