import Link from "next/link";
import { PortalLoginForm } from "@/components/portal/portal-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Affiliate & coach login" };

export default function PortalLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-[0.2em] text-brand-gold"
          >
            ACCSHOP
          </Link>
          <CardTitle className="mt-4 text-2xl">Affiliate &amp; coach login</CardTitle>
          <CardDescription>
            Sign in to your referral dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PortalLoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New affiliate?{" "}
            <Link href="/portal/signup" className="text-brand-gold underline">
              Sign up free
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
