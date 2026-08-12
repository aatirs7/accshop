"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { TrustIcons } from "@/components/marketing/trust-icons";

export interface BuyVariant {
  id: string;
  label: string;
  priceDeltaCents: number;
}

const STOCK: Record<
  string,
  { label: string; pct: number; tone: string }
> = {
  high: { label: "In stock", pct: 72, tone: "bg-brand-success" },
  low: { label: "Low stock", pct: 34, tone: "bg-brand-warning" },
  extremely_low: {
    label: "Extremely Low, few left",
    pct: 12,
    tone: "bg-destructive",
  },
};

export function ProductBuyBox({
  slug,
  basePriceCents,
  compareAtPriceCents,
  stockLabel,
  variants,
}: {
  slug: string;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  stockLabel: string;
  variants: BuyVariant[];
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((v) => v.id === variantId);
  const price = basePriceCents + (selected?.priceDeltaCents ?? 0);
  const stock = STOCK[stockLabel] ?? STOCK.high;

  const checkoutHref = useMemo(() => {
    const qs = variantId ? `?variant=${variantId}` : "";
    return `/checkout/${slug}${qs}`;
  }, [slug, variantId]);

  return (
    <aside className="h-fit rounded-2xl border border-brand-gold/25 bg-card/70 p-8 lg:sticky lg:top-24">
      <p className="text-sm text-muted-foreground">Price per account</p>
      <div className="mt-1 flex items-end gap-3">
        <p className="font-display text-5xl text-brand-gold">
          {formatMoney(price)}
        </p>
        {compareAtPriceCents && compareAtPriceCents > price && (
          <p className="mb-1 text-lg text-muted-foreground line-through">
            {formatMoney(compareAtPriceCents)}
          </p>
        )}
      </div>

      {/* Stock scarcity */}
      <div className="mt-5">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Stock: {stock.label}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${stock.tone}`}
            style={{ width: `${stock.pct}%` }}
          />
        </div>
      </div>

      {/* Variant selector */}
      {variants.length > 1 && (
        <fieldset className="mt-6 space-y-2">
          <legend className="text-sm font-medium">Options</legend>
          {variants.map((v) => (
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
                  name="variant"
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

      <div className="gold-hairline my-6" />
      <ul className="space-y-3 text-sm text-muted-foreground">
        <li>✓ Pay by card or Zelle</li>
        <li>✓ Encrypted delivery via your dashboard</li>
        <li>✓ Warranty countdown tracked per order</li>
      </ul>
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href={checkoutHref}>Add to cart</Link>
      </Button>
      <div className="mt-6">
        <TrustIcons />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ordering 10+?{" "}
        <Link href="/bulk" className="underline">
          Get bulk pricing
        </Link>
      </p>
    </aside>
  );
}
