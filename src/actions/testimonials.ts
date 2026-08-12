"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { testimonialSubmissions } from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { AdminNotifyEmail } from "@/lib/email/templates";

const schema = z.object({
  authorName: z.string().trim().min(1).max(120),
  authorHandle: z.string().trim().max(100).optional(),
  headline: z.string().trim().max(120).optional(),
  content: z.string().trim().min(10).max(2000),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  orderCode: z.string().trim().max(20).optional(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitTestimonialReview(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please add your name and a short review (10+ characters)." };
  }
  await db.insert(testimonialSubmissions).values(parsed.data);

  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject: "New testimonial submission",
        react: AdminNotifyEmail({
          heading: "New testimonial submission",
          lines: [
            `From: ${parsed.data.authorName}`,
            parsed.data.headline ? `"${parsed.data.headline}"` : "",
            parsed.data.content,
          ].filter(Boolean),
          url: `${env.APP_URL}/admin/testimonials`,
        }),
        text: `New testimonial from ${parsed.data.authorName}: ${parsed.data.content}`,
      }),
    ),
  );
  return { ok: true };
}
