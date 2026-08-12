"use client";

import { useActionState, useEffect, useState } from "react";
import { submitEmailCapture, type CaptureResult } from "@/actions/email-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const COOKIE = "accshop_offer_dismissed";

function hasDismissed() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));
}
function setDismissed() {
  // 30-day dismissal.
  document.cookie = `${COOKIE}=1; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax`;
}

export function EmailCapture() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissedState] = useState(true);
  const [state, action, pending] = useActionState<CaptureResult | null, FormData>(
    submitEmailCapture,
    null,
  );

  // Fire the modal a few seconds after load, unless already dismissed/captured.
  useEffect(() => {
    if (hasDismissed()) {
      setDismissedState(true);
      return;
    }
    setDismissedState(false);
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setOpen(false);
    setDismissed();
    setDismissedState(true);
  }

  useEffect(() => {
    if (state?.ok) {
      toast.success(`Code ${state.discountCode} is yours`);
    }
  }, [state]);

  // Once dismissed with no capture, show the reopen side tab.
  if (dismissed && !open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setDismissedState(false);
        }}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-brand-gold/40 bg-brand-gold px-2 py-4 text-xs font-bold uppercase tracking-wider text-[oklch(0.17_0.02_85)] [writing-mode:vertical-rl] hover:bg-brand-gold-dim"
        aria-label="Get $10 off"
      >
        Get $10 Off
      </button>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-brand-gold/30 bg-card shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="bg-atmosphere p-8 text-center">
          {state?.ok ? (
            <>
              <p className="text-4xl">🎉</p>
              <h2 className="mt-3 font-display text-2xl font-medium">
                Here&apos;s your {state.amountFormatted} off
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use this code at checkout. We&apos;ve emailed it to you too.
              </p>
              <div className="mt-5 rounded-lg border border-brand-gold/40 bg-background px-5 py-3 font-mono text-2xl tracking-[0.15em] text-brand-gold">
                {state.discountCode}
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => {
                  navigator.clipboard.writeText(state.discountCode);
                  toast.success("Code copied");
                }}
              >
                Copy code
              </Button>
            </>
          ) : (
            <>
              <span className="inline-block rounded-full border border-brand-gold/40 px-3 py-1 text-xs uppercase tracking-wider text-brand-gold">
                Limited-time offer
              </span>
              <h2 className="mt-4 font-display text-3xl font-medium text-balance">
                Get $10 off your first account
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
                Drop your email and we&apos;ll send a one-time discount code,
                instantly.
              </p>
              <form action={action} className="mt-6 space-y-3">
                <input type="hidden" name="source" value="popup" />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="text-center"
                />
                <Button type="submit" size="lg" disabled={pending} className="w-full">
                  {pending ? "Sending…" : "Send my code"}
                </Button>
                {state && !state.ok && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
              </form>
              <button
                onClick={dismiss}
                className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
              >
                No thanks
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
