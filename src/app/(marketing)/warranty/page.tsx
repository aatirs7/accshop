import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Warranty policy" };

const sections = [
  {
    title: "What's covered",
    body: "Every account purchased from ACCSHOP is covered by a 30-day replacement warranty starting the day your credentials are delivered. If your account is banned, restricted from TikTok Shop Affiliate, or its follower count was materially misrepresented, we replace it free of charge.",
  },
  {
    title: "What's not covered",
    body: "Issues caused after handover by skipping the included warmup guide, running prohibited content, mass-following, or violating TikTok's community guidelines are not covered. Accounts that have had their credentials shared with third parties are also excluded, treat your credentials like a bank password.",
  },
  {
    title: "How to file a claim",
    body: "Open your order in the dashboard, select the affected account, and submit a claim with a short description. Claims are reviewed within 24–48 hours. Approved claims receive a replacement account through the same secure delivery pipeline, your warranty continues on the replacement.",
  },
  {
    title: "Warranty tracking",
    body: "No guesswork: every order in your dashboard shows a live warranty countdown, so you always know exactly how many days of coverage remain on each account.",
  },
];

export default function WarrantyPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
            Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
            30-day warranty, in plain words
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
            One month of full coverage from the moment of delivery. Here&apos;s
            exactly what that means.
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
          <Button asChild>
            <Link href="/dashboard">Check my warranty status</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
