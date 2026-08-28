"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountStock, suppliers } from "@/lib/db/schema";
import {
  credentialFingerprint,
  encryptCredential,
  type CredentialPayload,
} from "@/lib/crypto/credentials";
import { ulid } from "ulid";
import { sendPushToAdmins } from "@/lib/push/send";
import type { FormResult } from "@/actions/inquiries";

const stockSchema = z.object({
  token: z.string().min(1),
  username: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(500),
  email: z.string().trim().min(1).max(300),
});

/**
 * No-login submission: a supplier with a valid link drops off one account's
 * details, which sit encrypted in the stock pool until an admin pulls one
 * out to fulfill a paid order.
 */
export async function submitAccountStock(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = stockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fill in username, password, and email." };
  }
  const { token, username, password, email } = parsed.data;

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.submitToken, token),
  });
  if (!supplier || !supplier.active) {
    return { ok: false, error: "This submission link is no longer active." };
  }

  const payload: CredentialPayload = {
    fields: [
      { label: "Username", value: username },
      { label: "Password", value: password },
      { label: "Linked email", value: email },
    ],
  };

  // AAD binds ciphertext to this specific stock row; generate the id
  // up front so it can be used before the insert.
  const stockId = ulid();
  const enc = encryptCredential(payload, stockId);
  await db.insert(accountStock).values({
    id: stockId,
    supplierId: supplier.id,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    fingerprint: credentialFingerprint(payload),
  });

  await sendPushToAdmins({
    title: "New account added to stock",
    body: `${supplier.name} just submitted an account.`,
    url: "/admin/stock",
  });

  return { ok: true };
}
