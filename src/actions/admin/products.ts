"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  productImages,
  productVariants,
  products,
  uploads,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Upload a product image from a file (phone camera roll / photo picker).
 * Stored in the DB and served via /api/uploads/[id]; attached as a gallery
 * image on the product.
 */
export async function uploadProductImage(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");
  if (!productId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "That file isn't an image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image is too large (max 8MB)." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const [upload] = await db
    .insert(uploads)
    .values({ data: bytes, contentType: file.type, createdBy: admin.id })
    .returning();

  const count = await db.query.productImages.findMany({
    where: eq(productImages.productId, productId),
  });
  await db.insert(productImages).values({
    productId,
    url: `/api/uploads/${upload.id}`,
    sort: count.length,
  });

  await audit({
    actorUserId: admin.id,
    action: "product.image_uploaded",
    entityType: "product",
    entityId: productId,
  });
  revalidatePath("/admin/products");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true };
}

const dollarsToCents = (v: string | null | undefined) =>
  v && v.trim() ? Math.round(parseFloat(v) * 100) : null;

const productSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000),
  retailPrice: z.coerce.number().min(1).max(1_000_000),
  cost: z.coerce.number().min(0).max(1_000_000),
  compareAtPrice: z.string().optional(),
  stockLabel: z.enum(["high", "low", "extremely_low"]),
  screenshotUrl: z.string().trim().max(2000).optional(),
  featured: z.union([z.literal("on"), z.undefined()]).optional(),
  active: z.union([z.literal("on"), z.undefined()]).optional(),
});

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the product fields." };
  const d = parsed.data;

  const compareAt = dollarsToCents(d.compareAtPrice);
  await db
    .update(products)
    .set({
      name: d.name,
      description: d.description,
      retailPriceCents: Math.round(d.retailPrice * 100),
      costCents: Math.round(d.cost * 100),
      compareAtPriceCents: compareAt,
      stockLabel: d.stockLabel,
      screenshotUrl: d.screenshotUrl || null,
      featured: d.featured === "on",
      active: d.active === "on",
    })
    .where(eq(products.id, d.productId));

  await audit({
    actorUserId: admin.id,
    action: "product.updated",
    entityType: "product",
    entityId: d.productId,
  });
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true };
}

const imageSchema = z.object({
  productId: z.string().min(1),
  url: z.string().trim().url().max(2000),
});

export async function addProductImage(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = imageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Enter a valid image URL." };
  const count = await db.query.productImages.findMany({
    where: eq(productImages.productId, parsed.data.productId),
  });
  await db.insert(productImages).values({
    productId: parsed.data.productId,
    url: parsed.data.url,
    sort: count.length,
  });
  await audit({
    actorUserId: admin.id,
    action: "product.image_added",
    entityType: "product",
    entityId: parsed.data.productId,
  });
  revalidatePath("/admin/products");
  revalidatePath("/accounts");
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [deleted] = await db
    .delete(productImages)
    .where(eq(productImages.id, imageId))
    .returning();
  if (deleted) {
    await audit({
      actorUserId: admin.id,
      action: "product.image_deleted",
      entityType: "product",
      entityId: deleted.productId,
    });
    revalidatePath("/admin/products");
    revalidatePath("/accounts");
  }
  return { ok: true };
}

const variantSchema = z.object({
  productId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  priceDelta: z.coerce.number().min(0).max(1_000_000),
});

export async function addProductVariant(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the variant fields." };
  const count = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, parsed.data.productId),
  });
  await db.insert(productVariants).values({
    productId: parsed.data.productId,
    label: parsed.data.label,
    priceDeltaCents: Math.round(parsed.data.priceDelta * 100),
    sort: count.length,
  });
  await audit({
    actorUserId: admin.id,
    action: "product.variant_added",
    entityType: "product",
    entityId: parsed.data.productId,
  });
  revalidatePath("/admin/products");
  revalidatePath("/accounts");
  return { ok: true };
}

export async function deleteProductVariant(
  variantId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [deleted] = await db
    .delete(productVariants)
    .where(eq(productVariants.id, variantId))
    .returning();
  if (deleted) {
    await audit({
      actorUserId: admin.id,
      action: "product.variant_deleted",
      entityType: "product",
      entityId: deleted.productId,
    });
    revalidatePath("/admin/products");
    revalidatePath("/accounts");
  }
  return { ok: true };
}
