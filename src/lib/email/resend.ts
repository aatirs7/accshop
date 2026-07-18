import { Resend } from "resend";
import type { ReactElement } from "react";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Transactional email wrapper. Email failure must never block a payment or
 * fulfillment transition — errors are logged, not thrown. In dev without a
 * RESEND_API_KEY, emails are printed to the console (including magic links,
 * which is how you sign in locally).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
  text: string;
}): Promise<void> {
  if (!resend) {
    console.log(
      `\n--- EMAIL (dev fallback) ---\nTo: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}\n----------------------------\n`,
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
      text: opts.text,
    });
    if (error) console.error("Email send failed:", error);
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
