"use client";

import { useState } from "react";
import type { ActionResult } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { useRun } from "./use-run";

type Variant = "default" | "outline" | "ghost" | "destructive";

/**
 * Two-step button: the first click shows the question with Confirm and
 * Cancel in place, the second runs the action. No browser dialogs.
 */
export function ConfirmAction(props: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  question: string;
  confirmLabel?: string;
  successText: string;
  variant?: Variant;
  size?: "sm" | "default";
}) {
  const { pending, run } = useRun();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button
        type="button"
        variant={props.variant ?? "outline"}
        size={props.size ?? "sm"}
        disabled={pending}
        onClick={() => setAsking(true)}
      >
        {pending ? "Working..." : props.children}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <span className="text-xs">{props.question}</span>
      <Button
        type="button"
        size="sm"
        variant={props.variant === "destructive" ? "destructive" : "default"}
        disabled={pending}
        onClick={() =>
          run(props.action, props.successText, () => setAsking(false))
        }
      >
        {pending ? "Working..." : (props.confirmLabel ?? "Confirm")}
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
  );
}
