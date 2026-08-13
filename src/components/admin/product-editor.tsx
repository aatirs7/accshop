"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addProductImage,
  addProductVariant,
  deleteProductImage,
  deleteProductVariant,
  updateProduct,
  uploadProductImage,
} from "@/actions/admin/products";
import type { ActionResult } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";

function useRun() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(ok);
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

export interface EditorProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  retailPriceCents: number;
  compareAtPriceCents: number | null;
  stockLabel: string;
  screenshotUrl: string | null;
  featured: boolean;
  active: boolean;
  images: { id: string; url: string }[];
  variants: { id: string; label: string; priceDeltaCents: number }[];
}

export function ProductEditor({ product }: { product: EditorProduct }) {
  const { pending, run } = useRun();

  return (
    <div className="space-y-8">
      {/* Core fields */}
      <form
        action={(fd) => run(() => updateProduct(fd), "Product saved")}
        className="space-y-4"
      >
        <input type="hidden" name="productId" value={product.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs" htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={product.name} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs" htmlFor="retailPrice">Price ($)</Label>
            <Input
              id="retailPrice"
              name="retailPrice"
              type="number"
              step="0.01"
              defaultValue={(product.retailPriceCents / 100).toString()}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="compareAtPrice">
              Compare-at ($, optional)
            </Label>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              step="0.01"
              defaultValue={
                product.compareAtPriceCents
                  ? (product.compareAtPriceCents / 100).toString()
                  : ""
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="stockLabel">Stock label</Label>
            <select
              id="stockLabel"
              name="stockLabel"
              defaultValue={product.stockLabel}
              className="mt-1 block h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option className="bg-card" value="high">High</option>
              <option className="bg-card" value="low">Low</option>
              <option className="bg-card" value="extremely_low">Extremely Low</option>
            </select>
          </div>
          <div>
            <Label className="text-xs" htmlFor="screenshotUrl">Card image URL</Label>
            <Input
              id="screenshotUrl"
              name="screenshotUrl"
              defaultValue={product.screenshotUrl ?? ""}
              placeholder="https://…"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs" htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product.description}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product.featured}
              className="accent-[oklch(0.83_0.115_85)]"
            />
            Featured (homepage carousel)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product.active}
              className="accent-[oklch(0.83_0.115_85)]"
            />
            Active (visible in catalog)
          </label>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
      </form>

      {/* Images */}
      <div className="rounded-lg border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Gallery images</h3>
        <div className="mt-3 space-y-2">
          {product.images.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No images yet. The product page shows a styled placeholder until
              you add some.
            </p>
          )}
          {product.images.map((img) => (
            <div key={img.id} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-10 w-10 rounded object-cover" />
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {img.url}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => deleteProductImage(img.id), "Image removed")
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        {/* Upload from camera roll / photo library */}
        <form
          action={(fd) => run(() => uploadProductImage(fd), "Image uploaded")}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-gold file:px-3 file:py-1.5 file:text-[oklch(0.17_0.02_85)]"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Uploading…" : "Upload photo"}
          </Button>
        </form>
        {/* Or paste an image URL */}
        <form
          action={(fd) => run(() => addProductImage(fd), "Image added")}
          className="mt-2 flex gap-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <Input name="url" placeholder="…or paste an image URL" className="h-9" />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Add URL
          </Button>
        </form>
      </div>

      {/* Variants */}
      <div className="rounded-lg border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Variants</h3>
        <div className="mt-3 space-y-2">
          {product.variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{v.label}</span>
              <span className="text-brand-gold">
                {v.priceDeltaCents > 0 ? `+${formatMoney(v.priceDeltaCents)}` : "no change"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => deleteProductVariant(v.id), "Variant removed")
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <form
          action={(fd) => run(() => addProductVariant(fd), "Variant added")}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <Label className="text-xs">Label</Label>
            <Input name="label" placeholder="Enable TikTok Shop" className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Price delta ($)</Label>
            <Input name="priceDelta" type="number" step="0.01" defaultValue="0" className="mt-1 h-9 w-28" />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Add variant
          </Button>
        </form>
      </div>
    </div>
  );
}
