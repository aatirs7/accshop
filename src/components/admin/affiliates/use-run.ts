"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/actions/admin/orders";

/** Run a server action, toast the outcome, refresh the route. */
export function useRun() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const run = (
    fn: () => Promise<ActionResult>,
    successText: string,
    onSuccess?: () => void,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(successText);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  return { pending, run };
}
