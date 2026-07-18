import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="bg-atmosphere">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
          Support
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">
          Talk to a human
        </h1>
        <p className="mt-4 text-muted-foreground">
          Questions before you buy, order support, or warranty help — we
          answer fast.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Order &amp; warranty support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Already a customer? The fastest path is your dashboard — file
                warranty claims and track orders there.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Bulk &amp; partner inquiries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Buying for a mentorship program or need 10+ accounts? Use the
                bulk form and we&apos;ll reply within 24 hours.
              </p>
              <Button asChild variant="outline">
                <Link href="/bulk">Bulk inquiry</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          You can also reply to any ACCSHOP email — replies land directly in
          our inbox.
        </p>
      </div>
    </main>
  );
}
