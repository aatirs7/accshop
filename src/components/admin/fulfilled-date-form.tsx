"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setFulfilledDate } from "@/actions/admin/orders";

/**
 * Date picker + save for the day an order was fulfilled. Starts (or moves)
 * the 14-day warranty. Defaults to today.
 */
export function FulfilledDateForm(props: {
  orderId: string;
  defaultDay: string;
  minDay: string;
  maxDay: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const [day, setDay] = useState(props.defaultDay);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setFulfilledDate(props.orderId, day);
          if (result.ok) {
            toast.success("Fulfilled date saved, warranty updated");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <input
        type="date"
        value={day}
        min={props.minDay}
        max={props.maxDay}
        required
        onChange={(e) => setDay(e.target.value)}
        aria-label="Fulfilled date"
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm [color-scheme:dark]"
      />
      <Button
        type="submit"
        size="sm"
        variant={props.variant ?? "default"}
        disabled={pending || !day}
      >
        {pending ? "Saving…" : props.label}
      </Button>
    </form>
  );
}
