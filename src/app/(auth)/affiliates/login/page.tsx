import Link from "next/link";
import { PortalLoginForm } from "@/components/portal/portal-forms";
import { AFFILIATE_DASHBOARD_PATH, AFFILIATE_JOIN_PATH } from "@/lib/affiliates/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Affiliate login" };

export default function AffiliateLoginPage() {
  return (
    <main className="bg-atmosphere flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="font-display text-xl font-bold tracking-[0.2em] text-brand-gold">
            ACCSHOP
          </Link>
          <CardTitle className="mt-4 text-2xl">Affiliate login</CardTitle>
          <CardDescription>Sign in to see your sales, earnings and share link.</CardDescription>
        </CardHeader>
        <CardContent>
          <PortalLoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(AFFILIATE_DASHBOARD_PATH)}`}
              className="text-brand-gold underline"
            >
              Get a sign-in link
            </Link>
          </p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New affiliate?{" "}
            <Link href={AFFILIATE_JOIN_PATH} className="text-brand-gold underline">
              Join free
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
