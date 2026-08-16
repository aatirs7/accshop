import { redirect } from "next/navigation";

// Admin login now lives at /admin itself; keep this path working for old links.
export default function AdminLoginRedirect() {
  redirect("/admin");
}
