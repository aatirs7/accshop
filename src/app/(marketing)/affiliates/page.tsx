import Link from "next/link";
import {
  AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS,
  AFFILIATE_JOIN_PATH,
  AFFILIATE_LOGIN_PATH,
  PAYOUT_METHODS,
} from "@/lib/affiliates/constants";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Affiliate program" };

export default function AffiliatesPage() {
  const perAccount = formatMoney(AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS);
  const labels = PAYOUT_METHODS.map((m) => m.label);
  const payoutList = `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;

  const steps = [
    {
      n: "01",
      title: "Join free",
      body: "Fill out one short form and pick your own code. Your share link is ready the moment you finish.",
    },
    {
      n: "02",
      title: "Share your code",
      body: "Post it, go LIVE with it, send it to your community. Buyers enter it at checkout or use your link.",
    },
    {
      n: "03",
      title: `Earn ${perAccount} per account`,
      body: `Every account sold with your code earns you ${perAccount}. Someone buys three? You earn ${formatMoney(3 * AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS)}.`,
    },
    {
      n: "04",
      title: "Get paid",
      body: `ACCSHOP pays you directly by ${payoutList}. You track every sale live.`,
    },
  ];

  const perks = [
    { title: "Flat and simple", body: `${perAccount} per account. No tiers, no percentages to work out.` },
    { title: "Your own code", body: "Pick a code people remember, like your name or brand." },
    { title: "Live dashboard", body: "See every sale, what's pending and what's been paid." },
  ];

  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">Affiliate program</p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-balance sm:text-5xl">
            Earn <span className="text-brand-gold">{perAccount}</span> for every account you sell
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground text-balance">
            Share your code. When someone buys a TikTok Shop account with it, you earn {perAccount} per account,
            paid out by ACCSHOP. Free to join, no application.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href={AFFILIATE_JOIN_PATH}>Become an affiliate</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Already an affiliate?{" "}
              <Link href={AFFILIATE_LOGIN_PATH} className="text-brand-gold underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="font-display text-2xl">How it works</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n} className="border-border/60 bg-card/60 text-center">
              <CardHeader>
                <span className="font-display text-4xl font-light text-brand-gold/30">{s.n}</span>
                <CardTitle className="mt-2 font-display text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title} className="text-center">
              <h3 className="font-display text-lg text-foreground">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-brand-gold/40 bg-card/60 p-8 text-center">
          <h2 className="font-display text-3xl">Ready to start earning?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            It takes about a minute. You&apos;ll have your code and share link as soon as you finish.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full px-8">
            <Link href={AFFILIATE_JOIN_PATH}>Join the affiliate program</Link>
          </Button>
        </div>

        <div className="mt-14 rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
          <h2 className="font-display text-2xl">Running a mentorship or coaching program?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Coaches get referral commissions plus wholesale pricing on bulk buys. Apply to the partner program for
            the full package.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/partners">Partner program</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
