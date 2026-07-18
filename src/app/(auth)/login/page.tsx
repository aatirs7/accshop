import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  async function sendLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) redirect("/login?error=invalid");
    await signIn("resend", {
      email,
      redirect: false,
      redirectTo: callbackUrl || "/dashboard",
    });
    redirect("/login/check-email");
  }

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
          <CardTitle className="mt-4 text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a secure one-time sign-in
            link. No password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full">
              Send sign-in link
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Use the same email you checked out with to see your orders.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
