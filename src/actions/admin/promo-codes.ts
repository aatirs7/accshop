"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { promoCodeSettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { PROMO_CODES } from "@/lib/promo-codes";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/actions/admin/orders";

/** Switch a hand-issued promo code on or off at checkout. */
export async function setPromoCodeActive(code: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(code in PROMO_CODES)) return { ok: false, error: "Unknown promo code." };
  await db
    .insert(promoCodeSettings)
    .values({ code, active, updatedAt: new Date() })
    .onConflictDoUpdate({ target: promoCodeSettings.code, set: { active, updatedAt: new Date() } });
  await audit({
    actorUserId: admin.id,
    action: active ? "promo.enabled" : "promo.disabled",
    entityType: "promo_code",
    entityId: code,
  });
  revalidatePath("/admin/promo-codes");
  return { ok: true };
}
