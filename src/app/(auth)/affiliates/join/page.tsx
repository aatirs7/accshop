import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates, partners, users } from "@/lib/db/schema";
import { canEarn, needsProfile } from "@/lib/affiliates/auth";
import {
  AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS,
  AFFILIATE_DASHBOARD_PATH,
  AFFILIATE_LOGIN_PATH,
} from "@/lib/affiliates/constants";
import { formatMoney } from "@/lib/format";
import { JoinForm, type JoinFormProps } from "@/components/affiliates/onboarding/join-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Become an ACCSHOP affiliate" };

export default async function AffiliateJoinPage() {
  const perAccount = formatMoney(AFFILIATE_COMMISSION_PER_ACCOUNT_CENTS);
  const session = await auth();

  let formProps: JoinFormProps = { needsPassword: true };
  let isCoach = false;

  if (session?.user) {
    const [me, affiliate, partner] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { email: true, name: true, passwordHash: true },
      }),
      db.query.affiliates.findFirst({ where: eq(affiliates.userId, session.user.id) }),
      db.query.partners.findFirst({ where: eq(partners.userId, session.user.id), columns: { id: true } }),
    ]);
    // A fully set-up affiliate has nothing to do here.
    if (affiliate && !needsProfile(affiliate)) redirect(AFFILIATE_DASHBOARD_PATH);
    isCoach = Boolean(partner);
    if (me) {
      formProps = {
        signedInEmail: me.email,
        needsPassword: !me.passwordHash,
        defaults: {
          name: me.name,
          username: affiliate?.username,
          code: affiliate?.code,
          payoutMethod: affiliate?.payoutMethod,
          payoutHandle: affiliate?.payoutHandle,
        },
        codeLocked: affiliate ? !canEarn(affiliate) : false,
      };
    }
  }

  const finishing = Boolean(formProps.defaults?.code);

  return (
    <main className="bg-atmosphere flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link href="/" className="font-display text-xl font-bold tracking-[0.2em] text-brand-gold">
            ACCSHOP
          </Link>
          <CardTitle className="mt-4 text-2xl">
            {finishing ? "Finish your affiliate profile" : "Become an ACCSHOP affiliate"}
          </CardTitle>
          <CardDescription className="text-balance">
            Earn <span className="font-semibold text-brand-gold">{perAccount}</span> for every account sold
            with your code. Free to join, no application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCoach ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                You&apos;re signed in with an ACCSHOP coach account. Coaches earn through the partner program, so
                this account can&apos;t also join as an affiliate.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to your coach dashboard</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="mb-6 space-y-2 rounded-xl border border-brand-gold/25 bg-brand-gold/5 p-4 text-sm">
                <li>
                  <span className="font-medium text-foreground">Pick your code.</span>{" "}
                  <span className="text-muted-foreground">You get a link to share right after you join.</span>
                </li>
                <li>
                  <span className="font-medium text-foreground">Buyers use it at checkout.</span>{" "}
                  <span className="text-muted-foreground">
                    Every account they buy earns you {perAccount}, tracked live in your dashboard.
                  </span>
                </li>
                <li>
                  <span className="font-medium text-foreground">Get paid by ACCSHOP.</span>{" "}
                  <span className="text-muted-foreground">
                    The owner sends your earnings to the payout method you choose below.
                  </span>
                </li>
              </ul>
              <JoinForm {...formProps} />
              {!session?.user && (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Already an affiliate?{" "}
                  <Link href={AFFILIATE_LOGIN_PATH} className="text-brand-gold underline">
                    Log in
                  </Link>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
