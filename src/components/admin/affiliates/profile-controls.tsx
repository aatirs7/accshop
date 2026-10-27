"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  changeAffiliateCode,
  checkAffiliateCode,
  deleteAffiliates,
  setAffiliateGoals,
  setAffiliateStatus,
} from "@/actions/admin/affiliates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmAction } from "./confirm-action";
import { useRun } from "./use-run";

type AffiliateStatus = "active" | "suspended" | "deactivated";

const STATUS_OPTIONS: {
  value: AffiliateStatus;
  label: string;
  explain: string;
}[] = [
  {
    value: "active",
    label: "Activate",
    explain: "Their code works at checkout and new sales earn commission.",
  },
  {
    value: "suspended",
    label: "Suspend",
    explain:
      "A pause. Their code stops earning on new sales, but they can still sign in and see their history. Use while you look into something.",
  },
  {
    value: "deactivated",
    label: "Deactivate",
    explain:
      "They have left the program. Their code stops earning. Existing commissions stay and can still be paid or reversed.",
  },
];

export function StatusControls({
  affiliateId,
  status,
}: {
  affiliateId: string;
  status: AffiliateStatus;
}) {
  return (
    <div className="space-y-3">
      {STATUS_OPTIONS.map((o) => (
        <div
          key={o.value}
          className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{o.label}</p>
            <p className="text-xs text-muted-foreground">{o.explain}</p>
          </div>
          {status === o.value ? (
            <span className="shrink-0 text-xs font-medium text-brand-gold">Current</span>
          ) : (
            <ConfirmAction
              action={() => setAffiliateStatus(affiliateId, o.value)}
              question={`${o.label} this affiliate?`}
              successText="Status updated"
              variant={o.value === "active" ? "default" : o.value === "deactivated" ? "destructive" : "outline"}
            >
              {o.label}
            </ConfirmAction>
          )}
        </div>
      ))}
    </div>
  );
}

export function GoalsForm({
  affiliateId,
  hours,
  sessions,
}: {
  affiliateId: string;
  hours: number;
  sessions: number;
}) {
  const { pending, run } = useRun();
  return (
    <form
      className="space-y-3"
      action={(fd) => run(() => setAffiliateGoals(fd), "Goals saved")}
    >
      <input type="hidden" name="affiliateId" value={affiliateId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs" htmlFor="goal-hours">LIVE hours per week</Label>
          <Input
            id="goal-hours"
            name="hours"
            type="number"
            min={0}
            max={168}
            step={1}
            defaultValue={hours}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs" htmlFor="goal-sessions">Sessions per week</Label>
          <Input
            id="goal-sessions"
            name="sessions"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={sessions}
            required
            className="mt-1"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save goals"}
      </Button>
    </form>
  );
}

export function CodeForm({
  affiliateId,
  code,
}: {
  affiliateId: string;
  code: string;
}) {
  const { pending, run } = useRun();
  const [value, setValue] = useState(code);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const changed = value.trim().toUpperCase() !== code;

  async function runCheck() {
    if (!changed) {
      setCheck(null);
      return;
    }
    setChecking(true);
    try {
      const res = await checkAffiliateCode(value, affiliateId);
      setCheck(res.ok ? { ok: true, text: `${res.code} is available.` } : { ok: false, text: res.error });
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      className="space-y-3"
      action={(fd) =>
        run(() => changeAffiliateCode(fd), "Code changed", () => setCheck(null))
      }
    >
      <input type="hidden" name="affiliateId" value={affiliateId} />
      <div>
        <Label className="text-xs" htmlFor="aff-code">Referral code</Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="aff-code"
            name="code"
            value={value}
            maxLength={20}
            onChange={(e) => {
              setValue(e.target.value);
              setCheck(null);
            }}
            onBlur={runCheck}
            className="font-mono uppercase"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={!changed || checking}
            onClick={runCheck}
          >
            {checking ? "Checking..." : "Check"}
          </Button>
        </div>
        {check && (
          <p className={`mt-1 text-xs ${check.ok ? "text-brand-success" : "text-destructive"}`}>
            {check.text}
          </p>
        )}
      </div>
      {changed && (
        <p className="rounded-md border border-brand-warning/40 bg-brand-warning/10 px-3 py-2 text-xs text-brand-warning">
          Heads up: links and posts using {code} stop working the moment you
          save. Let the affiliate know so they can update their bio and links.
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        disabled={pending || !changed || check?.ok === false}
      >
        {pending ? "Saving..." : "Change code"}
      </Button>
    </form>
  );
}

/**
 * Permanently remove a fake or filler profile. Refused server-side when the
 * affiliate has commissions; those should be deactivated instead.
 */
export function DeleteAffiliate({
  affiliateId,
  hasCommissions,
}: {
  affiliateId: string;
  hasCommissions: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const router = useRouter();

  if (hasCommissions) {
    return (
      <p className="text-xs text-muted-foreground">
        This affiliate has commissions, so the profile can&apos;t be deleted. Deactivate them instead.
      </p>
    );
  }

  const remove = () =>
    startTransition(async () => {
      const result = await deleteAffiliates([affiliateId]);
      if (result.ok) {
        toast.success("Affiliate deleted");
        router.push("/admin/affiliates");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Removes this affiliate profile, their code and their LIVE reports for good. Use it for fake
        or filler signups.
      </p>
      {asking ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
          <span className="text-xs">Delete this affiliate for good?</span>
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
            {pending ? "Deleting..." : "Delete"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setAsking(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="destructive" onClick={() => setAsking(true)}>
          Delete affiliate
        </Button>
      )}
    </div>
  );
}
