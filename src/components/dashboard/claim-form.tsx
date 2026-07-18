"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitWarrantyClaim, type ClaimResult } from "@/actions/claims";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClaimForm({ deliverableId }: { deliverableId: string }) {
  const [state, action, pending] = useActionState<ClaimResult | null, FormData>(
    submitWarrantyClaim,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-6 text-center">
        <p className="font-display text-lg text-brand-gold">Claim received ✓</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We review claims within 24–48 hours and will email you the outcome.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard">Back to my orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <div className="space-y-2">
        <Label htmlFor="reason">What happened?</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={5}
          required
          minLength={10}
          placeholder="e.g. Account was banned on day 3 despite following the warmup guide…"
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit claim"}
      </Button>
    </form>
  );
}
