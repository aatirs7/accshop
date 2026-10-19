"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  dailyTasks,
  dailyFulfillments,
  dailyNotes,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const PATH = "/admin/daily-operations";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const day = z.string().regex(DAY_RE, "Pick a valid date.");

// ---------------------------------------------------------------------------
// Daily tasks
// ---------------------------------------------------------------------------

const addTaskSchema = z.object({
  opDate: day,
  description: z.string().trim().min(1, "Enter a task.").max(500),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export async function addTask(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const rawPriority = String(formData.get("priority") ?? "").trim();
  const parsed = addTaskSchema.safeParse({
    opDate: formData.get("opDate"),
    description: formData.get("description"),
    priority: rawPriority === "" ? undefined : rawPriority,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the task." };
  }
  const { opDate, description, priority } = parsed.data;

  // New tasks go to the bottom of the day's list.
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${dailyTasks.sortOrder}), -1)` })
    .from(dailyTasks)
    .where(eq(dailyTasks.opDate, opDate));

  await db.insert(dailyTasks).values({
    opDate,
    description,
    priority: priority ?? null,
    sortOrder: (max ?? -1) + 1,
    createdBy: admin.id,
  });

  revalidatePath(PATH);
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean): Promise<ActionResult> {
  await requireAdmin();
  const [row] = await db
    .update(dailyTasks)
    .set({ done })
    .where(eq(dailyTasks.id, id))
    .returning({ id: dailyTasks.id });
  if (!row) return { ok: false, error: "That task was already removed." };
  revalidatePath(PATH);
  return { ok: true };
}

const editTaskSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().min(1, "Enter a task.").max(500),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
});

export async function editTask(input: {
  id: string;
  description: string;
  priority: "low" | "medium" | "high" | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = editTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the task." };
  }
  const [row] = await db
    .update(dailyTasks)
    .set({ description: parsed.data.description, priority: parsed.data.priority ?? null })
    .where(eq(dailyTasks.id, parsed.data.id))
    .returning({ id: dailyTasks.id });
  if (!row) return { ok: false, error: "That task was already removed." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
  revalidatePath(PATH);
  return { ok: true };
}

/** Swap a task's order with its neighbour above/below within the same day. */
export async function moveTask(id: string, dir: "up" | "down"): Promise<ActionResult> {
  await requireAdmin();
  const [task] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id));
  if (!task) return { ok: false, error: "That task was already removed." };

  const ordered = await db
    .select()
    .from(dailyTasks)
    .where(eq(dailyTasks.opDate, task.opDate))
    .orderBy(asc(dailyTasks.sortOrder), asc(dailyTasks.createdAt));

  const idx = ordered.findIndex((t) => t.id === id);
  const swapWith = dir === "up" ? ordered[idx - 1] : ordered[idx + 1];
  if (!swapWith) return { ok: true }; // already at the edge, nothing to do

  await db
    .update(dailyTasks)
    .set({ sortOrder: swapWith.sortOrder })
    .where(eq(dailyTasks.id, task.id));
  await db
    .update(dailyTasks)
    .set({ sortOrder: task.sortOrder })
    .where(eq(dailyTasks.id, swapWith.id));

  revalidatePath(PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fulfillment tracker
// ---------------------------------------------------------------------------

const addFulfillmentSchema = z.object({
  opDate: day,
  customerName: z.string().trim().min(1, "Enter the customer.").max(200),
  item: z.string().trim().min(1, "Enter what needs fulfilling.").max(500),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function addFulfillment(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const rawQty = String(formData.get("quantity") ?? "").trim();
  const parsed = addFulfillmentSchema.safeParse({
    opDate: formData.get("opDate"),
    customerName: formData.get("customerName"),
    item: formData.get("item"),
    quantity: rawQty === "" ? undefined : rawQty,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the entry." };
  }
  const { opDate, customerName, item, quantity, notes } = parsed.data;

  const [row] = await db
    .insert(dailyFulfillments)
    .values({
      opDate,
      customerName,
      item,
      quantity: quantity ?? null,
      notes: notes || null,
      status: "pending",
      createdBy: admin.id,
    })
    .returning({ id: dailyFulfillments.id });

  await audit({
    actorUserId: admin.id,
    action: "fulfillment.add",
    entityType: "daily_fulfillment",
    entityId: row.id,
    metadata: { customerName, item, opDate },
  });

  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Change a fulfillment's status. `viewDate` is the day the owner is looking at,
 * which becomes `fulfilledOn` when the item is marked fulfilled, so the history
 * records the day the owner closed it (not the server's UTC wall-clock). Moving
 * off "fulfilled" clears the completion day again.
 */
export async function setFulfillmentStatus(
  id: string,
  status: "pending" | "in_progress" | "fulfilled",
  viewDate: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!DAY_RE.test(viewDate)) return { ok: false, error: "Invalid date." };

  const [row] = await db
    .update(dailyFulfillments)
    .set({ status, fulfilledOn: status === "fulfilled" ? viewDate : null })
    .where(eq(dailyFulfillments.id, id))
    .returning({ id: dailyFulfillments.id });
  if (!row) return { ok: false, error: "That entry was already removed." };

  revalidatePath(PATH);
  return { ok: true };
}

const editFulfillmentSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().trim().min(1, "Enter the customer.").max(200),
  item: z.string().trim().min(1, "Enter what needs fulfilling.").max(500),
  quantity: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function editFulfillment(input: {
  id: string;
  customerName: string;
  item: string;
  quantity: number | null;
  notes: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = editFulfillmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the entry." };
  }
  const { id, customerName, item, quantity, notes } = parsed.data;
  const [row] = await db
    .update(dailyFulfillments)
    .set({ customerName, item, quantity: quantity ?? null, notes: notes || null })
    .where(eq(dailyFulfillments.id, id))
    .returning({ id: dailyFulfillments.id });
  if (!row) return { ok: false, error: "That entry was already removed." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteFulfillment(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [removed] = await db
    .delete(dailyFulfillments)
    .where(eq(dailyFulfillments.id, id))
    .returning({ id: dailyFulfillments.id, customerName: dailyFulfillments.customerName });
  if (!removed) return { ok: false, error: "That entry was already removed." };
  await audit({
    actorUserId: admin.id,
    action: "fulfillment.delete",
    entityType: "daily_fulfillment",
    entityId: id,
    metadata: { customerName: removed.customerName },
  });
  revalidatePath(PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const KEY_RE = /^(general|day:\d{4}-\d{2}-\d{2})$/;

/** Upsert a note by its key ("general" or "day:YYYY-MM-DD"). Used for autosave. */
export async function saveNote(noteKey: string, content: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!KEY_RE.test(noteKey)) return { ok: false, error: "Invalid note." };
  const clean = String(content ?? "").slice(0, 50_000);

  await db
    .insert(dailyNotes)
    .values({ noteKey, content: clean, updatedBy: admin.id })
    .onConflictDoUpdate({
      target: dailyNotes.noteKey,
      set: { content: clean, updatedAt: new Date(), updatedBy: admin.id },
    });

  // No revalidate: the client holds the authoritative text while typing, and a
  // refresh here would fight the textarea. The next full page load reads it.
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reads (used by the page)
// ---------------------------------------------------------------------------

export async function getDayTasks(opDate: string) {
  return db
    .select()
    .from(dailyTasks)
    .where(eq(dailyTasks.opDate, opDate))
    .orderBy(asc(dailyTasks.sortOrder), asc(dailyTasks.createdAt));
}

/** Items still open as of the given day (carry-forward). */
export async function getOutstandingFulfillments(opDate: string) {
  return db
    .select()
    .from(dailyFulfillments)
    .where(
      and(
        sql`${dailyFulfillments.opDate} <= ${opDate}`,
        or(isNull(dailyFulfillments.fulfilledOn), gt(dailyFulfillments.fulfilledOn, opDate)),
      ),
    )
    .orderBy(asc(dailyFulfillments.createdAt));
}

/** Items marked fulfilled on the given day (historical record). */
export async function getCompletedFulfillments(opDate: string) {
  return db
    .select()
    .from(dailyFulfillments)
    .where(eq(dailyFulfillments.fulfilledOn, opDate))
    .orderBy(asc(dailyFulfillments.createdAt));
}

export async function getNote(noteKey: string): Promise<string> {
  const [row] = await db
    .select({ content: dailyNotes.content })
    .from(dailyNotes)
    .where(eq(dailyNotes.noteKey, noteKey));
  return row?.content ?? "";
}
