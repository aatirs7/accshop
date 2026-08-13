import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Affiliate program" };

const steps = [
  { n: "01", title: "Sign up free", body: "Create an affiliate account in seconds and get your unique referral code and link." },
  { n: "02", title: "Share your link", body: "Send it to your audience or students. Anyone who buys with your code is tracked to you automatically." },
  { n: "03", title: "Earn 10%", body: "Get $55 commission on every 100K account sold through your link. Track it live in your dashboard." },
];

export default function AffiliatesPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Affiliate program
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-balance sm:text-5xl">
            Refer buyers, earn 10% on every sale
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground text-balance">
            That&apos;s $55 per 100K account. Open to anyone, no application
            needed. Sign up, share your link, and get paid on every referral.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/portal/signup">Become an affiliate</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/portal/login">Affiliate login</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n} className="border-border/60 bg-card/60">
              <CardHeader>
                <span className="font-display text-4xl font-light text-brand-gold/30">
                  {s.n}
                </span>
                <CardTitle className="mt-2 font-display text-lg">
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-brand-gold/25 bg-card/60 p-8 text-center">
          <h2 className="font-display text-2xl">Running a mentorship or coaching program?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Coaches get referral commissions plus wholesale pricing on bulk
            buys. Apply to the partner program for the full package.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/partners">Partner program</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
