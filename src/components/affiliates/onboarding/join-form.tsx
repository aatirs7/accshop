"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { joinAffiliate, type OnboardingState } from "@/actions/affiliates/onboarding";
import { AFFILIATE_LOGIN_PATH } from "@/lib/affiliates/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeInput, UsernameInput } from "./handle-inputs";
import { PayoutFields } from "./payout-fields";

export interface JoinFormProps {
  /** Set when the visitor is already signed in (e.g. a legacy affiliate). */
  signedInEmail?: string | null;
  /** Signed-in users who already have a password don't need another. */
  needsPassword: boolean;
  defaults?: {
    name?: string | null;
    username?: string | null;
    code?: string | null;
    payoutMethod?: string | null;
    payoutHandle?: string | null;
  };
  /** A legacy affiliate who isn't active keeps their current code. */
  codeLocked?: boolean;
}

export function JoinForm({ signedInEmail, needsPassword, defaults, codeLocked }: JoinFormProps) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(joinAffiliate, null);
  const [username, setUsername] = useState(defaults?.username ?? "");
  const [code, setCode] = useState(defaults?.code ?? "");
  const existingCode = defaults?.code ?? null;

  return (
    <form
      onSubmit={(e) => {
        // Submitting by hand keeps the typed values on screen when the server
        // returns an error (a plain form action resets the form).
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-5 text-left"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required maxLength={120} autoComplete="name" defaultValue={defaults?.name ?? ""} />
      </div>

      {signedInEmail ? (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{signedInEmail}</span>
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      )}

      {needsPassword && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
      )}

      <UsernameInput value={username} onChange={setUsername} current={defaults?.username} />

      <CodeInput
        value={code}
        onChange={setCode}
        current={existingCode}
        readOnly={codeLocked}
        hint={
          codeLocked
            ? "Your code can't be changed while your account is not active."
            : existingCode
              ? "This is your current code. Change it only if you want a new one; the old one stops working."
              : "Buyers enter this at checkout. 3 to 20 letters, numbers or dashes."
        }
      />

      <PayoutFields defaultMethod={defaults?.payoutMethod} defaultHandle={defaults?.payoutHandle} />

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-brand-gold" />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-brand-gold underline">
            Terms
          </Link>
          .
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
          {state.field === "email" && (
            <>
              {" "}
              <Link href={AFFILIATE_LOGIN_PATH} className="underline">
                Log in
              </Link>
            </>
          )}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Setting up your account…" : signedInEmail ? "Finish setup" : "Join and get my link"}
      </Button>
    </form>
  );
}
