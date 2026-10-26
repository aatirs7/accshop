import { redirect } from "next/navigation";

// Affiliate login moved to /affiliates/login; keep old links working.
export default function OldAffiliateLogin() {
  redirect("/affiliates/login");
}
