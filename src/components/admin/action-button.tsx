"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/actions/admin/orders";

/**
 * Generic admin action trigger: runs a bound server action, toasts the
 * outcome, refreshes the route. Pass `confirmText` for destructive actions.
 */
export function ActionButton(props: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default";
  confirmText?: string;
  successText?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={props.variant ?? "outline"}
      size={props.size ?? "sm"}
      disabled={pending}
      onClick={() => {
        if (props.confirmText && !window.confirm(props.confirmText)) return;
        startTransition(async () => {
          const result = await props.action();
          if (result.ok) {
            toast.success(props.successText ?? "Done");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      {pending ? "Working…" : props.children}
    </Button>
  );
}

/** Prompt-for-input variant (e.g. Zelle reference, resolution notes). */
export function PromptActionButton(props: {
  action: (value: string) => Promise<ActionResult>;
  promptText: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  successText?: string;
  allowEmpty?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={props.variant ?? "outline"}
      size="sm"
      disabled={pending}
      onClick={() => {
        const value = window.prompt(props.promptText);
        if (value === null) return;
        if (!value.trim() && !props.allowEmpty) {
          toast.error("A value is required.");
          return;
        }
        startTransition(async () => {
          const result = await props.action(value.trim());
          if (result.ok) {
            toast.success(props.successText ?? "Done");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      {pending ? "Working…" : props.children}
    </Button>
  );
}
