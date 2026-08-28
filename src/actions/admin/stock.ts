"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountStock, suppliers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  decryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { audit } from "@/lib/audit";
import type { ActionResult } from "./orders";

/** Issues (or replaces) the no-login link a supplier uses to submit accounts. */
export async function generateSupplierLink(
  supplierId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const token = randomBytes(18).toString("base64url");
  const [updated] = await db
    .update(suppliers)
    .set({ submitToken: token })
    .where(eq(suppliers.id, supplierId))
    .returning();
  if (!updated) return { ok: false, error: "Supplier not found." };
  await audit({
    actorUserId: admin.id,
    action: "supplier.link_generated",
    entityType: "supplier",
    entityId: supplierId,
  });
  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export type RevealStockResult =
  | { ok: true; payload: CredentialPayload }
  | { ok: false; error: string };

/** Decrypts a stocked account for admin viewing (e.g. to fulfill an order). */
export async function revealAccountStock(
  stockId: string,
): Promise<RevealStockResult> {
  const admin = await requireAdmin();
  const stock = await db.query.accountStock.findFirst({
    where: eq(accountStock.id, stockId),
  });
  if (!stock) return { ok: false, error: "Account not found." };

  let payload: CredentialPayload;
  try {
    payload = decryptCredential(
      {
        ciphertext: stock.ciphertext,
        iv: stock.iv,
        authTag: stock.authTag,
        keyVersion: stock.keyVersion,
      },
      stock.id,
    );
  } catch (err) {
    console.error("Account stock decrypt failed", stock.id, err);
    return { ok: false, error: "Something went wrong decrypting this account." };
  }

  await audit({
    actorUserId: admin.id,
    action: "account_stock.reveal",
    entityType: "account_stock",
    entityId: stockId,
  });
  return { ok: true, payload };
}

/** Removes a stocked account once its details have been handed to a customer. */
export async function deleteAccountStock(stockId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [deleted] = await db
    .delete(accountStock)
    .where(eq(accountStock.id, stockId))
    .returning({ id: accountStock.id });
  if (!deleted) return { ok: false, error: "Account not found." };
  await audit({
    actorUserId: admin.id,
    action: "account_stock.delete",
    entityType: "account_stock",
    entityId: stockId,
  });
  revalidatePath("/admin/stock");
  return { ok: true };
}
