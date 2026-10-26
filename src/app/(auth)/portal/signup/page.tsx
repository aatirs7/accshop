import { redirect } from "next/navigation";

// The affiliate signup moved to /affiliates/join; keep old links working.
export default function OldAffiliateSignup() {
  redirect("/affiliates/join");
}
