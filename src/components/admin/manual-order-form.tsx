"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addManualOrder } from "@/actions/admin/manual-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Manual entry for a single order taken outside of checkout — name, date,
 * amount. On success the form clears and the Overview refreshes so the new
 * revenue shows up in the stat cards straight away.
 */
export function ManualOrderForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const r = await addManualOrder(fd);
          if (r.ok) {
            toast.success("Order added");
            formRef.current?.reset();
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <Label className="text-xs" htmlFor="manual-name">Name</Label>
        <Input
          id="manual-name"
          name="customerName"
          required
          placeholder="Customer name"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="manual-date">Date</Label>
        <Input
          id="manual-date"
          name="soldOn"
          type="date"
          required
          defaultValue={todayInputValue()}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="manual-amount">Amount ($)</Label>
        <Input
          id="manual-amount"
          name="amount"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="0.00"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          What the customer paid you.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor="manual-profit">Profit ($, optional)</Label>
        <Input
          id="manual-profit"
          name="profit"
          type="number"
          step="0.01"
          placeholder="0.00"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Leave blank to only count the amount as revenue.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor="manual-notes">Notes (optional)</Label>
        <Input
          id="manual-notes"
          name="notes"
          placeholder="e.g. paid by Zelle"
          className="mt-1"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add order"}
        </Button>
      </div>
    </form>
  );
}
