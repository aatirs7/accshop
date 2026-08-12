"use client";

import { useActionState, useMemo, useState } from "react";
import { startCheckout, type CheckoutResult } from "@/actions/checkout";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PriceTier {
  minQty: number;
  unitPriceCents: number;
}

export interface CheckoutVariant {
  id: string;
  label: string;
  priceDeltaCents: number;
}

export function CheckoutForm(props: {
  productSlug: string;
  retailUnitCents: number;
  partnerTiers: PriceTier[];
  prefillEmail: string | null;
  isSignedIn: boolean;
  refPartner: string | null;
  variants: CheckoutVariant[];
  initialVariantId: string | null;
  discountAmountCents: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"stripe" | "zelle">("zelle");
  const [variantId, setVariantId] = useState(props.initialVariantId ?? "");
  const [discountCode, setDiscountCode] = useState("");
  const [state, action, pending] = useActionState<CheckoutResult | null, FormData>(
    startCheckout,
    null,
  );

  const baseUnit = useMemo(() => {
    const applicable = props.partnerTiers
      .filter((t) => t.minQty <= quantity)
      .sort((a, b) => b.minQty - a.minQty)[0];
    return applicable?.unitPriceCents ?? props.retailUnitCents;
  }, [quantity, props.partnerTiers, props.retailUnitCents]);

  const variant = props.variants.find((v) => v.id === variantId);
  const unitCents = baseUnit + (variant?.priceDeltaCents ?? 0);
  const subtotal = unitCents * quantity;
  const discountPreview = discountCode.trim() ? props.discountAmountCents : 0;
  const totalPreview = Math.max(100, subtotal - discountPreview);

  const nextTier = props.partnerTiers
    .filter((t) => t.minQty > quantity)
    .sort((a, b) => a.minQty - b.minQty)[0];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="productSlug" value={props.productSlug} />
      {props.refPartner && (
        <input type="hidden" name="ref" value={props.refPartner} />
      )}
      <input type="hidden" name="variantId" value={variantId} />

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={100}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
          }
          className="max-w-[120px]"
        />
        {nextTier && (
          <p className="text-xs text-brand-gold">
            Your partner rate drops to {formatMoney(nextTier.unitPriceCents)}
            /account at {nextTier.minQty}+.
          </p>
        )}
      </div>

      {props.variants.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Options</legend>
          {props.variants.map((v) => (
            <label
              key={v.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors ${
                variantId === v.id
                  ? "border-brand-gold/60 bg-brand-gold/5"
                  : "border-border/60 hover:border-border"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="variantChoice"
                  value={v.id}
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                  className="accent-[oklch(0.83_0.115_85)]"
                />
                {v.label}
              </span>
              {v.priceDeltaCents > 0 && (
                <span className="text-brand-gold">
                  +{formatMoney(v.priceDeltaCents)}
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={props.prefillEmail ?? ""}
          readOnly={props.isSignedIn}
          placeholder="you@example.com"
          className={props.isSignedIn ? "opacity-70" : ""}
        />
        <p className="text-xs text-muted-foreground">
          Your credentials are delivered to a secure dashboard tied to this
          email, double-check it.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Payment method</legend>
        {(
          [
            {
              id: "zelle",
              title: "Zelle",
              desc: "No fees. We confirm your transfer manually, usually within a few hours.",
            },
            {
              id: "stripe",
              title: "Card",
              desc: "Instant confirmation via secure card checkout.",
            },
          ] as const
        ).map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              method === m.id
                ? "border-brand-gold/60 bg-brand-gold/5"
                : "border-border/60 hover:border-border"
            }`}
          >
            <input
              type="radio"
              name="method"
              value={m.id}
              checked={method === m.id}
              onChange={() => setMethod(m.id)}
              className="mt-1 accent-[oklch(0.83_0.115_85)]"
            />
            <span>
              <span className="block text-sm font-semibold">{m.title}</span>
              <span className="block text-xs text-muted-foreground">
                {m.desc}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="discountCode">Discount code</Label>
        <Input
          id="discountCode"
          name="discountCode"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
          placeholder="Optional"
          className="max-w-[220px] uppercase"
        />
      </div>

      <div className="space-y-1 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {quantity} × {formatMoney(unitCents)}
          </span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {discountPreview > 0 && (
          <div className="flex items-center justify-between text-sm text-brand-gold">
            <span>Discount (if valid)</span>
            <span>− {formatMoney(subtotal - totalPreview)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-medium">Total</span>
          <span className="font-display text-3xl text-brand-gold">
            {formatMoney(totalPreview)}
          </span>
        </div>
      </div>

      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? "Preparing your order…"
          : method === "zelle"
            ? "Place order, get Zelle instructions"
            : "Continue to secure card payment"}
      </Button>
    </form>
  );
}
