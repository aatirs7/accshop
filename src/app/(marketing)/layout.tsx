import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TrustTicker } from "@/components/marketing/trust-ticker";
import { EmailCapture } from "@/components/marketing/email-capture";
import { socialProof } from "@/lib/db/queries/public";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accountsSold } = await socialProof();
  return (
    <>
      <SiteNav />
      <TrustTicker accountsSold={accountsSold} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <EmailCapture />
    </>
  );
}
