import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <span className="font-display text-xl font-bold tracking-[0.2em] text-brand-gold">
            ACCSHOP
          </span>
          <CardTitle className="mt-4 text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a sign-in link. It expires in 24 hours and can
            only be used once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wrong email?{" "}
            <Link href="/login" className="text-brand-gold underline">
              Try again
            </Link>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Staff member?{" "}
            <Link href="/admin" className="text-brand-gold underline">
              Sign in with a password
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
