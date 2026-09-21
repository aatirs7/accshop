"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addReplacement } from "@/actions/admin/replacements";
import { REPLACEMENT_COST_CENTS } from "@/lib/replacements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PER_ACCOUNT = REPLACEMENT_COST_CENTS / 100;

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Log banned accounts that had to be replaced. Cost is fixed at $180 each and
 * previewed live; on success the Overview refreshes so profit updates straight
 * away.
 */
export function ReplacementForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState(0);

  const cost = Math.max(0, Math.floor(accounts || 0)) * PER_ACCOUNT;

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const r = await addReplacement(fd);
          if (r.ok) {
            toast.success("Replacement logged");
            formRef.current?.reset();
            setAccounts(0);
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <Label className="text-xs" htmlFor="repl-accounts">Accounts replaced</Label>
        <Input
          id="repl-accounts"
          name="accounts"
          type="number"
          min={1}
          step={1}
          required
          placeholder="e.g. 2"
          className="mt-1"
          value={accounts || ""}
          onChange={(e) => setAccounts(Number(e.target.value))}
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="repl-date">Date</Label>
        <Input
          id="repl-date"
          name="replacedOn"
          type="date"
          required
          defaultValue={todayInputValue()}
          className="mt-1"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs" htmlFor="repl-notes">Notes (optional)</Label>
        <Input
          id="repl-notes"
          name="notes"
          placeholder="e.g. bulk order for @coach, 2 banned"
          className="mt-1"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Log replacement"}
        </Button>
        <p className="text-xs text-muted-foreground">
          ${PER_ACCOUNT} per account{cost > 0 ? ` · this entry costs $${cost.toLocaleString()}` : ""}, taken off profit.
        </p>
      </div>
    </form>
  );
}
