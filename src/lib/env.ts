import { z } from "zod";

/**
 * All server secrets pass through here. Values marked optional are only
 * required for the features that use them (Stripe, email) and are checked
 * again at point of use so dev can run without live keys.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // "pglite" (embedded dev DB) or a postgres:// URL (Neon in prod)
  DATABASE_URL: z.string().default("pglite"),
  AUTH_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("ACCSHOP <onboarding@resend.dev>"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // 32 bytes, base64, encrypts delivered account credentials at rest
  CREDENTIAL_KEY_V1: z.string().min(40),
  CREDENTIAL_KEY_VERSION: z.coerce.number().int().default(1),
  ADMIN_EMAILS: z.string().default(""),
  APP_URL: z.string().default("http://localhost:3000"),
  ZELLE_RECIPIENT_NAME: z.string().default("ACCSHOP"),
  ZELLE_RECIPIENT_HANDLE: z.string().default("payments@accshop.example"),
  // Support address shown to buyers post-purchase and in emails.
  SUPPORT_EMAIL: z.string().default("aashirsiddiqui13@gmail.com"),
  CRON_SECRET: z.string().optional(),
  // Social-proof display knobs. The account count added on top of the REAL
  // paid count so a new store can show a credible baseline without fabricating
  // individual orders; set to 0 to show only real sales.
  SOCIAL_PROOF_ACCOUNTS_BASE: z.coerce.number().int().default(0),
  SOCIAL_PROOF_RATING: z.string().default("4.8"),
  // Email-capture discount, in cents ($10 off by default).
  DISCOUNT_AMOUNT_CENTS: z.coerce.number().int().default(1000),
});

export const env = envSchema.parse(process.env);

export const adminEmails = env.ADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
