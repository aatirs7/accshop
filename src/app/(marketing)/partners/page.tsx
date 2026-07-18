import { PartnerApplicationForm } from "@/components/marketing/inquiry-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Partner program" };

const offers = [
  {
    title: "Wholesale supply",
    body: "Tiered pricing that drops at 10, 20, and 50+ accounts. Order weekly through your own account with partner rates applied automatically at checkout.",
  },
  {
    title: "Referral commissions",
    body: "Send your students to buy direct — you earn a commission on every sale attributed to you, without touching fulfillment or support.",
  },
  {
    title: "Hybrid",
    body: "Most partners do both: wholesale rates on bulk buys for their own resale, plus commission on students who purchase retail.",
  },
];

export default function PartnersPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Coach &amp; mentor program
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight sm:text-5xl">
            The account supply behind serious TikTok Shop mentors
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Your students need affiliate-ready accounts. We keep you supplied —
            or pay you for sending them our way. Partner status is by
            application only; pricing is never public.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {offers.map((o) => (
            <Card key={o.title} className="border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="font-display text-xl text-brand-gold">
                  {o.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {o.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-3xl">How partners work with us</h2>
            <ol className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">1. Apply below.</strong>{" "}
                Tell us about your program and expected volume.
              </li>
              <li>
                <strong className="text-foreground">2. We review personally.</strong>{" "}
                Every partner is vetted — usually within 24–48 hours.
              </li>
              <li>
                <strong className="text-foreground">3. Your rates go live.</strong>{" "}
                Sign in and your wholesale pricing applies automatically at
                checkout. Commission tracking runs in the background.
              </li>
              <li>
                <strong className="text-foreground">4. Scale weekly.</strong>{" "}
                Standing weekly orders, dedicated support, and volume history
                tracked in your dashboard.
              </li>
            </ol>
          </div>
          <div className="rounded-2xl border border-brand-gold/25 bg-card/70 p-8">
            <h2 className="font-display text-2xl">Apply for partner status</h2>
            <div className="mt-6">
              <PartnerApplicationForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
