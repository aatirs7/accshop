"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { startCheckout, type CheckoutResult } from "@/actions/checkout";
import { formatMoney } from "@/lib/format";
import { PROMO_CODES } from "@/lib/promo-codes";
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
  initialReferralCode: string | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(props.initialVariantId ?? "");
  const [promoCode, setPromoCode] = useState("");
  const [agreed, setAgreed] = useState(false);
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

  // Preview only, mirrors the server-side check in startCheckout.
  const appliedCode = promoCode.trim().toUpperCase();
  const promoValue = PROMO_CODES[appliedCode];
  const promoApplied = Boolean(promoValue);
  const discount = promoApplied ? Math.min(promoValue, subtotal - 100) : 0;
  const total = subtotal - discount;

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
      {/* Card (Stripe) is the only rail. */}
      <input type="hidden" name="method" value="stripe" />

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
          We email your account details and updates here, double-check it.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referralCode">Referral code (optional)</Label>
        <Input
          id="referralCode"
          name="referralCode"
          defaultValue={props.initialReferralCode ?? ""}
          placeholder="Have a code? Enter it here"
          className="max-w-[260px] uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="promoCode">Promo code (optional)</Label>
        <Input
          id="promoCode"
          name="promoCode"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Have a promo code? Enter it here"
          className="max-w-[260px] uppercase"
        />
        {promoApplied && (
          <p className="text-xs text-brand-gold">
            {formatMoney(discount)} off applied.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4 space-y-1.5">
        <p className="text-sm font-medium">Secure card checkout</p>
        <p className="text-xs text-muted-foreground">
          You&apos;ll be taken to our secure card checkout to pay.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Estimated delivery:</span>{" "}
          your account details are emailed to you within 1-5 hours of payment.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            14-day replacement-first warranty:
          </span>{" "}
          if anything&apos;s wrong, we replace the account first.
        </p>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="agreeTerms"
          name="agreeTerms"
          type="checkbox"
          required
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-[oklch(0.83_0.115_85)]"
        />
        <label htmlFor="agreeTerms" className="text-xs text-muted-foreground">
          I agree to the{" "}
          <Link href="/terms" className="underline" target="_blank">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline" target="_blank">
            Privacy Policy
          </Link>
          , and{" "}
          <Link href="/refund-policy" className="underline" target="_blank">
            Refund &amp; Replacement Policy
          </Link>
          .
        </label>
      </div>

      <div className="space-y-1 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {quantity} × {formatMoney(unitCents)}
          </span>
          <span
            className={
              promoApplied
                ? "text-lg text-muted-foreground line-through"
                : "font-display text-3xl text-brand-gold"
            }
          >
            {formatMoney(subtotal)}
          </span>
        </div>
        {promoApplied && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Promo {appliedCode}
            </span>
            <span className="font-display text-3xl text-brand-gold">
              {formatMoney(total)}
            </span>
          </div>
        )}
      </div>

      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !agreed}
        className="w-full"
      >
        {pending ? "Preparing your order…" : "Continue to secure checkout"}
      </Button>
    </form>
  );
}
