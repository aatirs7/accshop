"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { bulkInquiries, partnerApplications } from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { AdminNotifyEmail } from "@/lib/email/templates";

const bulkInquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional(),
  quantityInterest: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
});

const partnerApplicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  tiktokHandle: z.string().trim().min(1).max(100),
  otherSocials: z.string().trim().max(300).optional(),
  estWeeklyVolume: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
});

export type FormResult = { ok: true } | { ok: false; error: string };

async function notifyAdmins(heading: string, lines: string[], path: string) {
  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject: heading,
        react: AdminNotifyEmail({ heading, lines, url: `${env.APP_URL}${path}` }),
        text: `${heading}\n\n${lines.join("\n")}\n\n${env.APP_URL}${path}`,
      }),
    ),
  );
}

export async function submitBulkInquiry(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = bulkInquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please check your name and email and try again." };
  }
  await db.insert(bulkInquiries).values(parsed.data);
  await notifyAdmins(
    "New bulk order inquiry",
    [
      `From: ${parsed.data.name} <${parsed.data.email}>`,
      parsed.data.company ? `Company: ${parsed.data.company}` : "",
      parsed.data.quantityInterest
        ? `Quantity: ${parsed.data.quantityInterest}`
        : "",
      parsed.data.message ?? "",
    ].filter(Boolean),
    "/admin/inquiries",
  );
  return { ok: true };
}

export async function submitPartnerApplication(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = partnerApplicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please check the required fields and try again." };
  }
  await db.insert(partnerApplications).values(parsed.data);
  await notifyAdmins(
    "New partner application",
    [
      `From: ${parsed.data.name} <${parsed.data.email}>`,
      `TikTok: ${parsed.data.tiktokHandle}`,
      parsed.data.estWeeklyVolume
        ? `Est. weekly volume: ${parsed.data.estWeeklyVolume}`
        : "",
      parsed.data.message ?? "",
    ].filter(Boolean),
    "/admin/applications",
  );
  return { ok: true };
}
