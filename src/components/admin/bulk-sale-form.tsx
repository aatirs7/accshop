"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addBulkSale } from "@/actions/admin/bulk-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Manual entry for a bulk order supplied to a coach outside of checkout.
 * On success the form clears and the Overview refreshes so the new
 * revenue/profit shows up in the stat cards straight away.
 */
export function BulkSaleForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const r = await addBulkSale(fd);
          if (r.ok) {
            toast.success("Bulk order added");
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
        <Label className="text-xs" htmlFor="bulk-coach">Coach</Label>
        <Input
          id="bulk-coach"
          name="coachName"
          required
          placeholder="Coach name"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="bulk-accounts">Accounts supplied</Label>
        <Input
          id="bulk-accounts"
          name="accounts"
          type="number"
          min={1}
          step={1}
          required
          placeholder="e.g. 25"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="bulk-date">Date</Label>
        <Input
          id="bulk-date"
          name="soldOn"
          type="date"
          required
          defaultValue={todayInputValue()}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="bulk-revenue">Revenue ($)</Label>
        <Input
          id="bulk-revenue"
          name="revenue"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="0.00"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          What the coach paid you in total.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor="bulk-profit">Profit ($)</Label>
        <Input
          id="bulk-profit"
          name="profit"
          type="number"
          step="0.01"
          required
          placeholder="0.00"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Revenue minus what the accounts cost you.
        </p>
      </div>
      <div>
        <Label className="text-xs" htmlFor="bulk-notes">Notes (optional)</Label>
        <Input
          id="bulk-notes"
          name="notes"
          placeholder="e.g. paid by Zelle"
          className="mt-1"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add bulk order"}
        </Button>
      </div>
    </form>
  );
}
