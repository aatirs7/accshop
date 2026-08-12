"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCaptures } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendEmail } from "@/lib/email/resend";
import { WelcomeDiscountEmail } from "@/lib/email/templates";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  source: z.string().max(40).optional(),
});

// Unambiguous code, e.g. SAVE-7F3K9Q.
function generateDiscountCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % 32];
  return `SAVE-${s}`;
}

export type CaptureResult =
  | { ok: true; discountCode: string; amountFormatted: string }
  | { ok: false; error: string };

export async function submitEmailCapture(
  _prev: CaptureResult | null,
  formData: FormData,
): Promise<CaptureResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email." };
  }
  const { email, source } = parsed.data;
  const amount = env.DISCOUNT_AMOUNT_CENTS;

  // One active code per email: reuse an unredeemed existing one.
  const existing = await db.query.emailCaptures.findFirst({
    where: eq(emailCaptures.email, email),
  });
  if (existing && !existing.redeemedAt) {
    return {
      ok: true,
      discountCode: existing.discountCode,
      amountFormatted: formatMoney(existing.discountAmountCents),
    };
  }

  let code = generateDiscountCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(emailCaptures).values({
        email,
        discountCode: code,
        discountAmountCents: amount,
        source: source || "popup",
      });
      break;
    } catch {
      if (attempt === 2) {
        return { ok: false, error: "Something went wrong. Please try again." };
      }
      code = generateDiscountCode();
    }
  }

  await sendEmail({
    to: email,
    subject: `Your ${formatMoney(amount)} off code`,
    react: WelcomeDiscountEmail({
      discountCode: code,
      amountFormatted: formatMoney(amount),
      shopUrl: `${env.APP_URL}/accounts`,
    }),
    text: `Welcome to ACCSHOP! Use code ${code} for ${formatMoney(amount)} off your first account: ${env.APP_URL}/accounts`,
  });

  return { ok: true, discountCode: code, amountFormatted: formatMoney(amount) };
}
