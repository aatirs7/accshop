"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, stockAccounts, suppliers } from "@/lib/db/schema";
import {
  credentialFingerprint,
  encryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { audit } from "@/lib/audit";
import { ulid } from "ulid";

export type SupplierPortalResult = { ok: true } | { ok: false; error: string };

const submitSchema = z.object({
  token: z.string().min(1),
  productId: z.string().min(1),
  username: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(500),
  email: z.string().trim().email().max(300),
});

/**
 * Lets a supplier load an account into the stock pool from their private
 * link — no admin login required, gated only by the unguessable token.
 */
export async function submitStockAccount(
  _prev: SupplierPortalResult | null,
  formData: FormData,
): Promise<SupplierPortalResult> {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Fill in the account type, username, password, and email." };
  }
  const { token, productId, username, password, email } = parsed.data;

  const supplier = await db.query.suppliers.findFirst({
    where: and(eq(suppliers.accessToken, token), eq(suppliers.active, true)),
  });
  if (!supplier) {
    return { ok: false, error: "This link isn't active. Ask for a new one." };
  }
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return { ok: false, error: "Pick an account type." };

  const payload: CredentialPayload = {
    fields: [
      { label: "Username", value: username },
      { label: "Password", value: password },
      { label: "Email", value: email },
    ],
  };
  const stockId = ulid();
  const enc = encryptCredential(payload, stockId);
  await db.insert(stockAccounts).values({
    id: stockId,
    supplierId: supplier.id,
    productId: product.id,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    fingerprint: credentialFingerprint(payload),
  });

  await audit({
    action: "stock_account.added",
    entityType: "stock_account",
    entityId: stockId,
    metadata: { supplierId: supplier.id, productId: product.id },
  });

  revalidatePath(`/supplier/${token}`);
  revalidatePath("/admin/inventory");
  return { ok: true };
}
