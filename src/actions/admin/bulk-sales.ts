"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bulkSales } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const bulkSaleSchema = z.object({
  coachName: z.string().trim().min(1, "Enter the coach's name.").max(200),
  accounts: z.coerce.number().int().min(1).max(1_000_000),
  revenue: z.coerce.number().min(0).max(100_000_000),
  profit: z.coerce.number().min(-100_000_000).max(100_000_000),
  soldOn: z.string().regex(DAY_RE, "Pick the date of the sale."),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Record a bulk order the owner supplied directly to a coach, outside of
 * checkout. Revenue and profit are typed in as dollars; the Overview adds
 * them to the paid-order numbers for whichever period is selected.
 */
export async function addBulkSale(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = bulkSaleSchema.safeParse({
    coachName: formData.get("coachName"),
    accounts: formData.get("accounts"),
    revenue: formData.get("revenue"),
    profit: formData.get("profit"),
    soldOn: formData.get("soldOn"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "");
    const friendly: Record<string, string> = {
      coachName: "Enter the coach's name.",
      accounts: "Enter how many accounts were supplied (a whole number).",
      revenue: "Enter the revenue in dollars.",
      profit: "Enter the profit in dollars.",
      soldOn: "Pick the date of the sale.",
    };
    return { ok: false, error: friendly[field] ?? issue?.message ?? "Check the form." };
  }
  const { coachName, accounts, revenue, profit, soldOn, notes } = parsed.data;

  // Store the chosen day as a UTC timestamp so it sorts and filters
  // consistently no matter which timezone the server runs in.
  const [y, m, d] = soldOn.split("-").map(Number);
  const soldAt = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(soldAt.getTime())) {
    return { ok: false, error: "Pick the date of the sale." };
  }

  const [row] = await db
    .insert(bulkSales)
    .values({
      coachName,
      accounts,
      revenueCents: Math.round(revenue * 100),
      profitCents: Math.round(profit * 100),
      soldAt,
      notes: notes || null,
      createdBy: admin.id,
    })
    .returning({ id: bulkSales.id });

  await audit({
    actorUserId: admin.id,
    action: "bulk_sale.add",
    entityType: "bulk_sale",
    entityId: row.id,
    metadata: { coachName, accounts, revenue, profit, soldOn },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteBulkSale(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [removed] = await db
    .delete(bulkSales)
    .where(eq(bulkSales.id, id))
    .returning({ id: bulkSales.id, coachName: bulkSales.coachName });
  if (!removed) return { ok: false, error: "That entry was already removed." };

  await audit({
    actorUserId: admin.id,
    action: "bulk_sale.delete",
    entityType: "bulk_sale",
    entityId: id,
    metadata: { coachName: removed.coachName },
  });

  revalidatePath("/admin");
  return { ok: true };
}
