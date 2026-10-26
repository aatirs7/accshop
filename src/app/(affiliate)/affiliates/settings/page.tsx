import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { canEarn, requireAffiliate } from "@/lib/affiliates/auth";
import { CopyField } from "@/components/dashboard/copy-field";
import { CodeForm, ProfileForm } from "@/components/affiliates/onboarding/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Affiliate settings" };

export default async function AffiliateSettingsPage() {
  const { user, affiliate } = await requireAffiliate();
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { name: true },
  });
  const shareLink = `${env.APP_URL}/accounts?code=${encodeURIComponent(affiliate.code)}`;
  const active = canEarn(affiliate);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your profile, payout details and affiliate code.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your share link</CardTitle>
          <CardDescription>
            {active
              ? "Send buyers here. Your code is applied at checkout automatically."
              : "Your code is not earning commission while your account is not active."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Link" value={shareLink} />
          <CopyField label="Code" value={affiliate.code} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile and payouts</CardTitle>
          <CardDescription>ACCSHOP sends your earnings to this payout method.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={me?.name ?? ""}
            username={affiliate.username}
            payoutMethod={affiliate.payoutMethod}
            payoutHandle={affiliate.payoutHandle}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change your code</CardTitle>
          <CardDescription>
            Your current code is <span className="font-mono text-brand-gold">{affiliate.code}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeForm key={affiliate.code} currentCode={affiliate.code} canChange={active} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly LIVE goals</CardTitle>
          <CardDescription>Set by ACCSHOP. Reach out if you think they should change.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="font-display text-3xl text-brand-gold">{affiliate.weeklyLiveHoursGoal}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Hours per week</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="font-display text-3xl text-brand-gold">{affiliate.weeklyLiveSessionsGoal}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">LIVE sessions per week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
