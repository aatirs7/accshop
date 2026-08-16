import Link from "next/link";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Admin" };

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/testimonials", label: "Testimonials" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Not signed in as an admin: show the login form right here at /admin.
  if (session?.user?.role !== "admin") {
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
            <CardDescription>Staff access only.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-sidebar md:block">
        <div className="sticky top-0 p-5">
          <Link
            href="/"
            className="font-display text-base font-bold tracking-[0.25em] text-brand-gold"
          >
            ACCSHOP
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Admin CRM</p>
          <nav className="mt-6 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-border/60 px-6 py-3 md:hidden">
          <nav className="flex gap-4 overflow-x-auto text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
