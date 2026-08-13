import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
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
          <CardTitle className="mt-4 text-2xl">Admin sign in</CardTitle>
          <CardDescription>
            Staff access. Customers sign in{" "}
            <Link href="/login" className="text-brand-gold underline">
              here
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
