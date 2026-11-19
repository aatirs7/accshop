"use client";

import { useId, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addManualOrder, updateManualOrder } from "@/actions/admin/manual-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** An already-logged manual order, as the edit form needs it. */
export type ManualOrderEntry = {
  id: string;
  customerName: string;
  soldOn: string; // YYYY-MM-DD
  amountCents: number;
  profitCents: number;
  notes: string | null;
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2);

/**
 * Manual entry for a single order taken outside of checkout — name, date,
 * amount. On success the form clears and the Overview refreshes so the new
 * revenue shows up in the stat cards straight away. Pass `entry` to edit an
 * order that was already logged instead of adding a new one.
 */
export function ManualOrderForm(props: {
  entry?: ManualOrderEntry;
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
            ? await updateManualOrder(entry.id, fd)
            : await addManualOrder(fd);
          if (r.ok) {
            toast.success(entry ? "Order updated" : "Order added");
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
        <Label className="text-xs" htmlFor={fid("name")}>Name</Label>
        <Input
          id={fid("name")}
          name="customerName"
          required
          placeholder="Customer name"
          defaultValue={entry?.customerName}
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
        <Label className="text-xs" htmlFor={fid("amount")}>Amount ($)</Label>
        <Input
          id={fid("amount")}
          name="amount"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="0.00"
          defaultValue={entry ? centsToInput(entry.amountCents) : undefined}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          What the customer paid you.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor={fid("profit")}>Profit ($, optional)</Label>
        <Input
          id={fid("profit")}
          name="profit"
          type="number"
          step="0.01"
          placeholder="0.00"
          defaultValue={
            entry && entry.profitCents ? centsToInput(entry.profitCents) : undefined
          }
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Leave blank to only count the amount as revenue.
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
          {pending ? "Saving…" : entry ? "Save changes" : "Add order"}
        </Button>
      </div>
    </form>
  );
}
