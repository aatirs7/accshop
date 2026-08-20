"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  suppliers,
  testimonialSubmissions,
  testimonials,
  uploads,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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

const testimonialSchema = z.object({
  authorName: z.string().trim().min(1).max(200),
  authorHandle: z.string().trim().max(100).optional(),
  content: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  source: z.string().trim().max(100).optional(),
  imageUrl: z.string().trim().max(500).optional(),
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
  const { createdAt, ...rest } = parsed.data;
  const [row] = await db
    .insert(testimonials)
    .values(createdAt ? { ...rest, createdAt } : rest)
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
  const { createdAt, ...rest } = parsed.data;
  await db
    .update(testimonials)
    .set(createdAt ? { ...rest, createdAt } : rest)
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

/** Upload a photo attached to a testimonial (e.g. a screenshot of the review). */
export async function uploadTestimonialImage(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id) return { ok: false, error: "Missing testimonial." };
  if (!(file instanceof File) || file.size === 0) {
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

  await db
    .update(testimonials)
    .set({ imageUrl: `/api/uploads/${upload.id}` })
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
