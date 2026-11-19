"use client";

import { useId, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addBulkSale, updateBulkSale } from "@/actions/admin/bulk-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** An already-logged bulk order, as the edit form needs it. */
export type BulkSaleEntry = {
  id: string;
  coachName: string;
  accounts: number;
  soldOn: string; // YYYY-MM-DD
  revenueCents: number;
  profitCents: number;
  notes: string | null;
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2);

/**
 * Manual entry for a bulk order supplied to a coach outside of checkout.
 * On success the form clears and the Overview refreshes so the new
 * revenue/profit shows up in the stat cards straight away. Pass `entry` to
 * edit a bulk order that was already logged instead of adding a new one.
 */
export function BulkSaleForm(props: {
  entry?: BulkSaleEntry;
  onSaved?: () => void;
} = {}) {
  const { entry, onSaved } = props;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const r = entry
            ? await updateBulkSale(entry.id, fd)
            : await addBulkSale(fd);
          if (r.ok) {
            toast.success(entry ? "Bulk order updated" : "Bulk order added");
            if (!entry) formRef.current?.reset();
            router.refresh();
            onSaved?.();
          } else {
            toast.error(r.error);
          }
        })
      }
      className={
        entry
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      <div className={entry ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-1"}>
        <Label className="text-xs" htmlFor={fid("coach")}>Coach</Label>
        <Input
          id={fid("coach")}
          name="coachName"
          required
          placeholder="Coach name"
          defaultValue={entry?.coachName}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("accounts")}>Accounts supplied</Label>
        <Input
          id={fid("accounts")}
          name="accounts"
          type="number"
          min={1}
          step={1}
          required
          placeholder="e.g. 25"
          defaultValue={entry?.accounts}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("date")}>Date</Label>
        <Input
          id={fid("date")}
          name="soldOn"
          type="date"
          required
          defaultValue={entry?.soldOn ?? todayInputValue()}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("revenue")}>Revenue ($)</Label>
        <Input
          id={fid("revenue")}
          name="revenue"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="0.00"
          defaultValue={entry ? centsToInput(entry.revenueCents) : undefined}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          What the coach paid you in total.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("profit")}>Profit ($)</Label>
        <Input
          id={fid("profit")}
          name="profit"
          type="number"
          step="0.01"
          required
          placeholder="0.00"
          defaultValue={entry ? centsToInput(entry.profitCents) : undefined}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Revenue minus what the accounts cost you.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("notes")}>Notes (optional)</Label>
        <Input
          id={fid("notes")}
          name="notes"
          placeholder="e.g. paid by Zelle"
          defaultValue={entry?.notes ?? undefined}
          className="mt-1"
        />
      </div>
      <div className={entry ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-3"}>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : entry ? "Save changes" : "Add bulk order"}
        </Button>
      </div>
    </form>
  );
}
