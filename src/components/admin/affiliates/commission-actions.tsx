"use client";

import { useState } from "react";
import { moveAffiliateCommission } from "@/actions/admin/affiliates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "./confirm-action";
import { useRun } from "./use-run";

type Status = "pending" | "approved" | "paid" | "reversed";

/**
 * Per-commission controls. Offers only the moves the foundation allows:
 * pending: Approve, Reverse. approved: Mark paid, Back to pending, Reverse.
 * paid: Reverse. reversed: Reopen.
 */
export function CommissionActions({
  id,
  status,
  amountLabel,
  payoutLabel,
  compact = false,
}: {
  id: string;
  status: Status;
  amountLabel: string;
  /** e.g. "PayPal: @name". Shown in the Mark paid confirmation. */
  payoutLabel?: string;
  /** Hide the "Back to pending" option (queue view). */
  compact?: boolean;
}) {
  const { pending, run } = useRun();
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState("");

  if (reversing) {
    return (
      <form
        className="flex w-full flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => moveAffiliateCommission(id, "reversed", reason),
            "Commission reversed",
            () => {
              setReversing(false);
              setReason("");
            },
          );
        }}
      >
        <Input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason, e.g. refunded"
          maxLength={500}
          className="h-8 min-w-40 flex-1"
          aria-label="Reversal reason"
        />
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={pending || reason.trim().length < 3}
        >
          {pending ? "Working..." : "Reverse"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setReversing(false)}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => moveAffiliateCommission(id, "approved"), "Commission approved")
          }
        >
          {pending ? "Working..." : "Approve"}
        </Button>
      )}
      {status === "approved" && (
        <ConfirmAction
          action={() => moveAffiliateCommission(id, "paid")}
          question={
            payoutLabel
              ? `Sent ${amountLabel} to ${payoutLabel}?`
              : `Sent ${amountLabel}?`
          }
          confirmLabel="Yes, mark paid"
          successText="Marked paid"
          variant="default"
        >
          Mark paid
        </ConfirmAction>
      )}
      {status === "approved" && !compact && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(() => moveAffiliateCommission(id, "pending"), "Moved back to pending")
          }
        >
          Back to pending
        </Button>
      )}
      {status === "reversed" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => moveAffiliateCommission(id, "pending"), "Commission reopened")
          }
        >
          {pending ? "Working..." : "Reopen"}
        </Button>
      )}
      {status !== "reversed" && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => setReversing(true)}
        >
          Reverse
        </Button>
      )}
    </div>
  );
}
