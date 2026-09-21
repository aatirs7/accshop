"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { replacements } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { replacementCostCents } from "@/lib/replacements";
import type { ActionResult } from "./orders";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const replacementSchema = z.object({
  accounts: z.coerce.number().int().min(1).max(1_000_000),
  replacedOn: z.string().regex(DAY_RE, "Pick the date."),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Log banned accounts the owner had to replace. Cost is fixed per account
 * ($180) and snapshotted, and the Overview subtracts it from profit for
 * whichever period is selected.
 */
export async function addReplacement(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = replacementSchema.safeParse({
    accounts: formData.get("accounts"),
    replacedOn: formData.get("replacedOn"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "");
    const friendly: Record<string, string> = {
      accounts: "Enter how many accounts you replaced (a whole number).",
      replacedOn: "Pick the date.",
    };
    return { ok: false, error: friendly[field] ?? issue?.message ?? "Check the form." };
  }
  const { accounts, replacedOn, notes } = parsed.data;

  const [y, m, d] = replacedOn.split("-").map(Number);
  const replacedAt = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(replacedAt.getTime())) {
    return { ok: false, error: "Pick the date." };
  }

  const [row] = await db
    .insert(replacements)
    .values({
      accounts,
      costCents: replacementCostCents(accounts),
      replacedAt,
      notes: notes || null,
      createdBy: admin.id,
    })
    .returning({ id: replacements.id });

  await audit({
    actorUserId: admin.id,
    action: "replacement.add",
    entityType: "replacement",
    entityId: row.id,
    metadata: { accounts, replacedOn },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteReplacement(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [removed] = await db
    .delete(replacements)
    .where(eq(replacements.id, id))
    .returning({ id: replacements.id });
  if (!removed) return { ok: false, error: "That entry was already removed." };

  await audit({
    actorUserId: admin.id,
    action: "replacement.delete",
    entityType: "replacement",
    entityId: id,
  });

  revalidatePath("/admin");
  return { ok: true };
}
