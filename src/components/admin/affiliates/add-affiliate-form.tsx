"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { createAffiliate } from "@/actions/admin/affiliates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRun } from "./use-run";

export function AddAffiliateForm() {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus />
        Add affiliate
      </Button>
    );
  }
  return (
    <form
      className="w-full space-y-3 rounded-lg border border-border/60 p-4"
      action={(fd) =>
        run(() => createAffiliate(fd), "Affiliate added", () => setOpen(false))
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs" htmlFor="aa-email">Email *</Label>
          <Input id="aa-email" name="email" type="email" required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="aa-name">Name *</Label>
          <Input id="aa-name" name="name" required maxLength={120} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="aa-code">Code *</Label>
          <Input
            id="aa-code"
            name="code"
            required
            maxLength={20}
            placeholder="e.g. JORDAN"
            className="mt-1 font-mono uppercase"
          />
        </div>
        <div>
          <Label className="text-xs" htmlFor="aa-username">Username</Label>
          <Input
            id="aa-username"
            name="username"
            maxLength={25}
            placeholder="optional"
            className="mt-1"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Creates their account if the email is new. They sign in with the
        magic link at /login and add their payout details themselves. Coaches
        and existing affiliates are refused.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
