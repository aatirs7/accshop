"use client";

import { useActionState, useState } from "react";
import { submitStockAccount, type SupplierPortalResult } from "@/actions/supplier-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SupplierAccountForm({
  token,
  products,
}: {
  token: string;
  products: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<SupplierPortalResult | null, FormData>(
    submitStockAccount,
    null,
  );
  // Remounts the form to clear its uncontrolled inputs after each successful
  // add, without an effect (React's "adjust state during render" pattern).
  const [resetKey, setResetKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) setResetKey((k) => k + 1);
  }

  return (
    <form key={resetKey} action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.ok && (
        <p className="rounded-md border border-brand-gold/40 bg-brand-gold/5 px-3 py-2 text-sm text-brand-gold">
          Account added. You can add another below.
        </p>
      )}
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="productId">Account type</Label>
        <select
          id="productId"
          name="productId"
          required
          className="block h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id} className="bg-card">
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Adding…" : "Add account"}
      </Button>
    </form>
  );
}
