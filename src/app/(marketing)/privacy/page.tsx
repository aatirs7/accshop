import Link from "next/link";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Privacy Policy" };

const sections = [
  {
    title: "What we collect",
    body: "Your email address, order history, and any details you submit through a warranty claim or contact form. If you pay by card, Stripe processes and stores your payment details, we never see or store your full card number.",
  },
  {
    title: "How we use it",
    body: "To fulfill and deliver your order, email your account credentials, track your 14-day warranty, respond to support requests, and send order-related updates. We don't sell your information to anyone.",
  },
  {
    title: "Marketing emails",
    body: "If you sign up for a discount code or opt in on-site, we may send occasional offers. Every marketing email includes a way to opt out, and doing so never affects your order or warranty status.",
  },
  {
    title: "Who we share it with",
    body: "Only the providers needed to run the store: Stripe for card payments, our email provider for order and account delivery emails, and our hosting provider. Each only receives what they need to do their job.",
  },
  {
    title: "Account credentials",
    body: "The login details for accounts you purchase are encrypted at rest and only decrypted to email them to you at delivery. We don't sell, share, or reuse account credentials for any purpose other than delivering your order.",
  },
  {
    title: "How long we keep data",
    body: "We keep order records for as long as needed to honor your warranty, handle disputes, and meet our accounting/legal obligations.",
  },
  {
    title: "Your choices",
    body: "You can ask us to update or delete your personal information at any time, subject to what we're required to keep for financial records. Just reach out and we'll take care of it.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
            What we collect, why, and how it&apos;s protected.
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
            Questions about your data? Email{" "}
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
