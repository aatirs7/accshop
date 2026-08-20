import Link from "next/link";
import { AffiliateSignupForm } from "@/components/portal/portal-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PolicyLinks } from "@/components/marketing/policy-links";

export const metadata = { title: "Become an affiliate" };

export default function AffiliateSignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-[0.2em] text-brand-gold"
          >
            ACCSHOP
          </Link>
          <CardTitle className="mt-4 text-2xl">Become an affiliate</CardTitle>
          <CardDescription>
            Refer buyers and earn 10% ($55) on every account sold with your code.
            Sign up free and get your link instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AffiliateSignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/portal/login" className="text-brand-gold underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
      <PolicyLinks />
    </main>
  );
}
