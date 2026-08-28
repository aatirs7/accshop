"use client";

import { useActionState } from "react";
import { submitAccountStock } from "@/actions/supplier-stock";
import type { FormResult } from "@/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SupplierStockForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    submitAccountStock,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-6 text-center">
        <p className="font-display text-lg text-brand-gold">Received ✓</p>
        <p className="mt-2 text-sm text-muted-foreground">
          That account has been added.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Submit another account
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="username">
          Username <span className="text-brand-gold">*</span>
        </Label>
        <Input id="username" name="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">
          Password <span className="text-brand-gold">*</span>
        </Label>
        <Input id="password" name="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">
          Linked email <span className="text-brand-gold">*</span>
        </Label>
        <Input id="email" name="email" required />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit account"}
      </Button>
    </form>
  );
}
