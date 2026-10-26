"use client";

import { useCallback, useRef, useState } from "react";
import type { AvailabilityResult } from "@/actions/affiliates/onboarding";

export type AvailabilityStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; value: string }
  | { state: "error"; message: string };

/**
 * Debounced server-side availability check for a code or username box.
 * Checks are fired from event handlers (typing, blur), never from effects,
 * and a stale response is dropped if the value changed in the meantime.
 */
export function useAvailability(
  check: (raw: string) => Promise<AvailabilityResult>,
  opts: { delayMs?: number; skip?: (value: string) => boolean } = {},
) {
  const { delayMs = 450, skip } = opts;
  const [status, setStatus] = useState<AvailabilityStatus>({ state: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  const run = useCallback(
    async (value: string) => {
      latest.current = value;
      if (timer.current) clearTimeout(timer.current);
      if (!value || skip?.(value)) {
        setStatus({ state: "idle" });
        return;
      }
      setStatus({ state: "checking" });
      try {
        const res = await check(value);
        if (latest.current !== value) return;
        setStatus(res.ok ? { state: "ok", value: res.value } : { state: "error", message: res.error });
      } catch {
        if (latest.current === value) setStatus({ state: "idle" });
      }
    },
    [check, skip],
  );

  /** Call on every change; the check runs once typing pauses. */
  const schedule = useCallback(
    (value: string) => {
      latest.current = value;
      if (timer.current) clearTimeout(timer.current);
      if (!value || skip?.(value)) {
        setStatus({ state: "idle" });
        return;
      }
      setStatus({ state: "checking" });
      timer.current = setTimeout(() => void run(value), delayMs);
    },
    [run, delayMs, skip],
  );

  /** Call on blur to check right away. */
  const now = useCallback((value: string) => void run(value), [run]);

  return { status, schedule, now };
}

export function AvailabilityHint({
  status,
  okText,
  idleText,
}: {
  status: AvailabilityStatus;
  okText: string;
  idleText?: string;
}) {
  if (status.state === "checking") {
    return <p className="text-xs text-muted-foreground">Checking…</p>;
  }
  if (status.state === "ok") {
    return <p className="text-xs text-brand-success">{okText}</p>;
  }
  if (status.state === "error") {
    return <p className="text-xs text-destructive">{status.message}</p>;
  }
  return idleText ? <p className="text-xs text-muted-foreground">{idleText}</p> : null;
}
