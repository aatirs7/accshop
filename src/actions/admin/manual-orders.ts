"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { manualOrders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const manualOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Enter the customer's name.").max(200),
  amount: z.coerce.number().min(0).max(100_000_000),
  // Optional: left blank when the owner is only tracking the sale amount.
  profit: z.coerce.number().min(-100_000_000).max(100_000_000).optional(),
  soldOn: z.string().regex(DAY_RE, "Pick the date of the order."),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Record a single order the owner took by hand, outside of checkout. The
 * amount is typed in as dollars; the Overview adds it to the paid-order and
 * bulk-order numbers for whichever period is selected.
 */
export async function addManualOrder(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const rawProfit = String(formData.get("profit") ?? "").trim();
  const parsed = manualOrderSchema.safeParse({
    customerName: formData.get("customerName"),
    amount: formData.get("amount"),
    profit: rawProfit === "" ? undefined : rawProfit,
    soldOn: formData.get("soldOn"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "");
    const friendly: Record<string, string> = {
      customerName: "Enter the customer's name.",
      amount: "Enter the order amount in dollars.",
      profit: "Enter the profit in dollars, or leave it blank.",
      soldOn: "Pick the date of the order.",
    };
    return { ok: false, error: friendly[field] ?? issue?.message ?? "Check the form." };
  }
  const { customerName, amount, profit, soldOn, notes } = parsed.data;

  // Store the chosen day as a UTC timestamp so it sorts and filters
  // consistently no matter which timezone the server runs in.
  const [y, m, d] = soldOn.split("-").map(Number);
  const soldAt = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(soldAt.getTime())) {
    return { ok: false, error: "Pick the date of the order." };
  }

  const [row] = await db
    .insert(manualOrders)
    .values({
      customerName,
      amountCents: Math.round(amount * 100),
      profitCents: Math.round((profit ?? 0) * 100),
      soldAt,
      notes: notes || null,
      createdBy: admin.id,
    })
    .returning({ id: manualOrders.id });

  await audit({
    actorUserId: admin.id,
    action: "manual_order.add",
    entityType: "manual_order",
    entityId: row.id,
    metadata: { customerName, amount, profit: profit ?? 0, soldOn },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteManualOrder(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [removed] = await db
    .delete(manualOrders)
    .where(eq(manualOrders.id, id))
    .returning({ id: manualOrders.id, customerName: manualOrders.customerName });
  if (!removed) return { ok: false, error: "That entry was already removed." };

  await audit({
    actorUserId: admin.id,
    action: "manual_order.delete",
    entityType: "manual_order",
    entityId: id,
    metadata: { customerName: removed.customerName },
  });

  revalidatePath("/admin");
  return { ok: true };
}
