"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  stockAccounts,
  suppliers,
  testimonialSubmissions,
  testimonials,
  uploads,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Uploads a testimonial photo (if provided) and returns its served URL. */
async function uploadTestimonialImage(
  formData: FormData,
  adminId: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const [upload] = await db
    .insert(uploads)
    .values({ data: bytes, contentType: file.type, createdBy: adminId })
    .returning();
  return `/api/uploads/${upload.id}`;
}

/** Approve a submitted review: copy it into published testimonials. */
export async function approveSubmission(
  submissionId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const sub = await db.query.testimonialSubmissions.findFirst({
    where: eq(testimonialSubmissions.id, submissionId),
  });
  if (!sub) return { ok: false, error: "Submission not found." };
  if (sub.status !== "new") return { ok: false, error: "Already reviewed." };

  await db.insert(testimonials).values({
    authorName: sub.authorName,
    authorHandle: sub.authorHandle,
    headline: sub.headline,
    content: sub.content,
    rating: sub.rating,
    source: "submission",
    published: true,
  });
  await db
    .update(testimonialSubmissions)
    .set({ status: "approved", reviewedBy: admin.id, decidedAt: new Date() })
    .where(eq(testimonialSubmissions.id, submissionId));

  await audit({
    actorUserId: admin.id,
    action: "testimonial.submission_approved",
    entityType: "testimonial_submission",
    entityId: submissionId,
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function rejectSubmission(
  submissionId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db
    .update(testimonialSubmissions)
    .set({ status: "rejected", reviewedBy: admin.id, decidedAt: new Date() })
    .where(eq(testimonialSubmissions.id, submissionId));
  await audit({
    actorUserId: admin.id,
    action: "testimonial.submission_rejected",
    entityType: "testimonial_submission",
    entityId: submissionId,
  });
  revalidatePath("/admin/testimonials");
  return { ok: true };
}

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactHandle: z.string().trim().max(200).optional(),
  defaultCostCents: z.coerce.number().int().min(0).max(10_000_000).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Supplier name is required." };
  const [row] = await db.insert(suppliers).values(parsed.data).returning();
  await audit({
    actorUserId: admin.id,
    action: "supplier.created",
    entityType: "supplier",
    entityId: row.id,
  });
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function updateSupplier(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supplierId = String(formData.get("supplierId") ?? "");
  if (!supplierId) return { ok: false, error: "Missing supplier." };
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Supplier name is required." };
  await db.update(suppliers).set(parsed.data).where(eq(suppliers.id, supplierId));
  await audit({
    actorUserId: admin.id,
    action: "supplier.updated",
    entityType: "supplier",
    entityId: supplierId,
  });
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function toggleSupplierActive(
  supplierId: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db.update(suppliers).set({ active }).where(eq(suppliers.id, supplierId));
  await audit({
    actorUserId: admin.id,
    action: "supplier.toggled",
    entityType: "supplier",
    entityId: supplierId,
    metadata: { active },
  });
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

/** (Re)generates the private link a supplier uses to load accounts in. */
export async function resetSupplierAccessLink(
  supplierId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const token = randomBytes(20).toString("hex");
  await db
    .update(suppliers)
    .set({ accessToken: token })
    .where(eq(suppliers.id, supplierId));
  await audit({
    actorUserId: admin.id,
    action: "supplier.access_link_reset",
    entityType: "supplier",
    entityId: supplierId,
  });
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

/** Removes a bad/duplicate stock entry a supplier loaded in by mistake. */
export async function deleteStockAccount(stockId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const row = await db.query.stockAccounts.findFirst({
    where: eq(stockAccounts.id, stockId),
  });
  if (!row) return { ok: false, error: "Not found." };
  if (row.used) return { ok: false, error: "Already assigned to an order." };
  await db.delete(stockAccounts).where(eq(stockAccounts.id, stockId));
  await audit({
    actorUserId: admin.id,
    action: "stock_account.deleted",
    entityType: "stock_account",
    entityId: stockId,
  });
  revalidatePath("/admin/inventory");
  return { ok: true };
}

const testimonialSchema = z.object({
  authorName: z.string().trim().min(1).max(200),
  authorHandle: z.string().trim().max(100).optional(),
  content: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  source: z.string().trim().max(100).optional(),
  createdAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export async function createTestimonial(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = testimonialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Name and content are required." };
  let imageUrl: string | null;
  try {
    imageUrl = await uploadTestimonialImage(formData, admin.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const { createdAt, ...rest } = parsed.data;
  const values = { ...rest, ...(imageUrl ? { imageUrl } : {}) };
  const [row] = await db
    .insert(testimonials)
    .values(createdAt ? { ...values, createdAt } : values)
    .returning();
  await audit({
    actorUserId: admin.id,
    action: "testimonial.created",
    entityType: "testimonial",
    entityId: row.id,
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function updateTestimonial(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing testimonial." };
  const parsed = testimonialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Name and content are required." };
  let imageUrl: string | null;
  try {
    imageUrl = await uploadTestimonialImage(formData, admin.id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const removeImage = formData.get("removeImage") === "on";
  const { createdAt, ...rest } = parsed.data;
  const values = {
    ...rest,
    ...(imageUrl ? { imageUrl } : removeImage ? { imageUrl: null } : {}),
  };
  await db
    .update(testimonials)
    .set(createdAt ? { ...values, createdAt } : values)
    .where(eq(testimonials.id, id));
  await audit({
    actorUserId: admin.id,
    action: "testimonial.updated",
    entityType: "testimonial",
    entityId: id,
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function setTestimonialFlags(
  id: string,
  flags: { published?: boolean; featured?: boolean },
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db.update(testimonials).set(flags).where(eq(testimonials.id, id));
  await audit({
    actorUserId: admin.id,
    action: "testimonial.updated",
    entityType: "testimonial",
    entityId: id,
    metadata: flags,
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db.delete(testimonials).where(eq(testimonials.id, id));
  await audit({
    actorUserId: admin.id,
    action: "testimonial.deleted",
    entityType: "testimonial",
    entityId: id,
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  return { ok: true };
}
