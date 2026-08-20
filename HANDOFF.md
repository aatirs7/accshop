# ACCSHOP — Handoff

Premium storefront + integrated CRM for selling established TikTok Affiliate accounts.
Next.js 16 (App Router) · Neon Postgres · Drizzle · Auth.js · Stripe + Zelle · Resend.

## Status: deployed & live

- **Production:** https://accshop-six.vercel.app (public, rendering off Neon)
- **Vercel project:** `aatir-siddiquis-projects/accshop` (framework preset set to `nextjs`)
- **Database:** Neon Postgres — schema migrated + seeded
- Build clean, 17/17 unit tests pass, all routes verified 200 / correct auth redirects

## What works right now

- Full storefront: home, catalog, product, testimonials, warranty, contact, bulk inquiry, partner program
- Checkout: Stripe Checkout + manual Zelle rail (unique order-code memo)
- Customer dashboard: order pipeline, one-time encrypted credential reveal, warranty countdown, claims
- Admin CRM: orders workbench, customers/LTV, partners + pricing rules + commissions, suppliers, application/inquiry/claim queues, reporting (revenue/margin, Stripe vs Zelle rail mix)
- Auth gating verified: `/dashboard` + `/admin` redirect unauthenticated users; non-admins get 404 on `/admin`
- Cron (`/api/cron/expire-zelle`) protected (401 without secret); Stripe webhook route live

## Blockers before real customers can use it

These are **"drop in the key"** items — infra is wired, just add values in Vercel → Settings → Environment Variables, then redeploy (`vercel --prod`).

1. **`RESEND_API_KEY`** + **`EMAIL_FROM`** — REQUIRED FOR LOGIN. Without it, magic-link sign-in emails print to Vercel function logs instead of sending, so no one (including admin) can actually sign in on production. Use a verified sending domain in `EMAIL_FROM`.
2. **`STRIPE_SECRET_KEY`** + **`STRIPE_WEBHOOK_SECRET`** — enables card checkout. Register the webhook at `https://accshop-six.vercel.app/api/webhooks/stripe` for events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`. Note: Stripe's ToS restricts social-account sales — Zelle is the independent fallback rail.
3. **`ZELLE_RECIPIENT_NAME`** + **`ZELLE_RECIPIENT_HANDLE`** — real Zelle details shown on the payment-instructions page.

Push alerts no longer need a Vercel env var step — `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (`src/lib/env.ts`) now default to a baked-in key pair, so the "Enable alerts" button in the admin panel works immediately; just tap it in the admin panel on your phone (works best after adding the admin panel to your home screen). Set your own pair in Vercel only if you need to invalidate existing subscriptions.

## Env vars already set in Vercel (production)

`DATABASE_URL` (Neon pooled), `AUTH_SECRET`, `CREDENTIAL_KEY_V1`, `ADMIN_EMAILS` (elysiumventuresgroup@gmail.com), `CRON_SECRET`, `APP_URL` (https://accshop-six.vercel.app).

> ⚠️ `CREDENTIAL_KEY_V1` encrypts delivered account credentials. Store a backup copy in a password manager — losing it makes undelivered credentials unrecoverable.

## Pre-launch content cleanup (recommended)

- **Demo data is in the live DB:** "Demo Customer", "Azam (Demo Partner)", demo orders in every pipeline state, and 3 `[SAMPLE]` testimonials (these render publicly on the homepage/testimonials page). Replace the testimonials with real quotes in Admin → Testimonials, and wipe the demo customers/orders for a clean slate + accurate reporting numbers.
- Currently one product tier ("100K"). New tiers = new rows in `products`, no code changes.

## Local development

```bash
npm install
# .env.local currently points DATABASE_URL at the live Neon DB.
# For isolated local work, set DATABASE_URL=pglite (embedded, no install) instead.
npm run db:migrate   # apply schema
npm run db:seed      # sample product, testimonials, admin, demo orders
npm run dev
```

Without `RESEND_API_KEY`, magic-link login links print to the terminal — that's how you sign in locally.

Scripts: `npm test` (unit), `npm run typecheck`, `npm run db:generate|migrate|push|seed`.
`scripts/verify-flows.ts` exercises the full order lifecycle (run with dev server stopped — PGlite is single-process).

## Architecture notes (non-obvious)

- **Dev DB is embedded PGlite** (`./.pglite`); prod is Neon. `@electric-sql/pglite` is in `serverExternalPackages` (next.config.ts) or its WASM fails to load. PGlite is single-process — stop the dev server before running seed/verify scripts.
- **Credentials** are AES-256-GCM encrypted with AAD = deliverableId (`src/lib/crypto/credentials.ts`). Delivery is by email (`emailAccountToCustomer` in `src/actions/admin/credentials.ts`), which decrypts and sends the plaintext to the buyer, then marks the order delivered. A legacy dashboard reveal-once flow (`UPDATE ... WHERE reveal_locked=false RETURNING`) still exists for in-flight orders started before the switch to email delivery; admin can unlock a re-reveal there (audited).
- **Both payment rails converge on `markOrderPaid()`** (`src/lib/payments/mark-paid.ts`). The Stripe webhook is the sole paid-authority (idempotent via `webhook_events`); Zelle is admin-confirmed. Referral commission accrues only for `source='referral'`, never wholesale partner buys.
- **Payment layer is an interface** (`src/lib/payments/provider.ts`) so a replacement processor is a one-file swap; all order/margin/commission state lives in our DB, so a Stripe freeze never freezes the business.
- **Warranty (30-day) is derived** from `deliveredAt`, never stored (`src/lib/orders/status.ts`).
- **Auth:** Auth.js v5 magic-link, DB sessions. `requireAdmin()` 404s non-admins (doesn't advertise the panel). `ADMIN_EMAILS` auto-promotes to admin on sign-in. Cheap redirect in `src/proxy.ts` (Next 16 renamed middleware → proxy); authoritative checks are server-side in every page/action.
- Brand tokens (dark + champagne gold) live in `src/app/globals.css` — swap there to rebrand.

## Key files

- `src/lib/db/schema.ts` — entire data model
- `src/lib/crypto/credentials.ts` — encryption + reveal-once
- `src/lib/payments/{provider,stripe,mark-paid}.ts` — payment abstraction + shared paid-transition
- `src/app/api/webhooks/stripe/route.ts` — Stripe paid-authority
- `src/lib/auth.ts` — Auth.js config, admin bootstrap
- `README.md` — setup + deploy detail
