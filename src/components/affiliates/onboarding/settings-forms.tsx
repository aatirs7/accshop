"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changeAffiliateCode,
  updateAffiliateProfile,
  type SettingsResult,
} from "@/actions/affiliates/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeInput, UsernameInput } from "./handle-inputs";
import { PayoutFields } from "./payout-fields";

function report(res: SettingsResult) {
  if (res.ok) toast.success(res.message);
  else toast.error(res.error);
}

export function ProfileForm({
  name,
  username,
  payoutMethod,
  payoutHandle,
}: {
  name: string;
  username: string | null;
  payoutMethod: string | null;
  payoutHandle: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [handle, setHandle] = useState(username ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateAffiliateProfile(fd);
          report(res);
          if (res.ok) router.refresh();
        });
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="settings-name">Full name</Label>
        <Input id="settings-name" name="name" defaultValue={name} required maxLength={120} autoComplete="name" />
      </div>
      <UsernameInput id="settings-username" value={handle} onChange={setHandle} current={username} />
      <PayoutFields idPrefix="settings-payout" defaultMethod={payoutMethod} defaultHandle={payoutHandle} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function CodeForm({ currentCode, canChange }: { currentCode: string; canChange: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(currentCode);
  const [confirming, setConfirming] = useState(false);
  const changed = code !== currentCode && code.length > 0;

  if (!canChange) {
    return (
      <p className="text-sm text-muted-foreground">
        Your code can&apos;t be changed while your account is not active.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirming) {
          setConfirming(true);
          return;
        }
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await changeAffiliateCode(fd);
          report(res);
          setConfirming(false);
          if (res.ok) router.refresh();
        });
      }}
      className="space-y-4"
    >
      <CodeInput
        id="settings-code"
        label="New code"
        value={code}
        onChange={(v) => {
          setCode(v);
          setConfirming(false);
        }}
        current={currentCode}
      />
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <p className="font-medium text-foreground">Heads up: your old code stops working immediately.</p>
        <p className="mt-1 text-muted-foreground">
          Any link or post that uses {currentCode} will no longer credit you. Update everywhere you have shared it.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={confirming ? "destructive" : "default"} disabled={!changed || pending}>
          {pending ? "Changing…" : confirming ? `Yes, switch to ${code}` : "Change code"}
        </Button>
        {confirming && !pending && (
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
