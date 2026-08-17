# ACCSHOP

Premium storefront + integrated CRM for selling established TikTok Affiliate accounts. Next.js (App Router) · Neon Postgres · Drizzle · Auth.js · Stripe + Zelle · Resend.

## What's inside

- **Storefront** — premium dark homepage, catalog (tiered, extensible), product pages, testimonials, warranty policy, contact, bulk-inquiry, and an application-gated partner program.
- **Checkout** — card (Stripe Checkout) or Zelle (manual confirmation with a unique order-code memo). Guest-feel but account-backed: every order is tied to a user.
- **Customer dashboard** — order pipeline (Sourcing → Credentials ready → Delivered), **one-time encrypted credential reveal**, live warranty countdown, and warranty claims.
- **Admin CRM** — orders workbench (advance fulfillment, mark Zelle paid, assign supplier + cost → live margin, attach/revoke credentials), customers with LTV, partners with wholesale pricing rules + commission ledger, suppliers, and queues for applications / bulk inquiries / warranty claims, plus a reporting overview (revenue, margin, **Stripe/Zelle rail mix**, source split, top LTV).

## Local development

```bash
npm install
cp .env.example .env.local     # fill in the generated secrets below
npm run db:migrate             # applies schema to the embedded PGlite dev DB
npm run db:seed                # sample product, testimonials, admin, demo orders
npm run dev
```

Dev uses an **embedded PGlite database** (`DATABASE_URL=pglite`, stored in `./.pglite`) — no Postgres install needed. Set `DATABASE_URL` to a `postgres://` (Neon) URL to use real Postgres.

Generate the two required secrets:

```bash
node -e "console.log('AUTH_SECRET='+require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('CREDENTIAL_KEY_V1='+require('crypto').randomBytes(32).toString('base64'))"
```

Set `ADMIN_EMAILS` to your email — it's auto-promoted to admin on sign-in. Without a `RESEND_API_KEY`, all emails (including magic-link sign-in links) print to the server console, so you can still sign in locally.

## Tests & verification

```bash
npm test                                               # unit: crypto, status machine, order codes
npx tsx --env-file=.env.local scripts/verify-flows.ts  # end-to-end order lifecycle (dev server must be stopped)
```

`verify-flows.ts` exercises: mark-paid + idempotency, one-deliverable-per-account, reveal-once atomicity + admin unlock, referral-vs-wholesale commission accrual, and the Zelle expiry sweep.

## Deploying to Vercel

1. Create a **Neon** project; set `DATABASE_URL` to its pooled connection string.
2. Run `npm run db:migrate` against it (locally with that `DATABASE_URL`, or via CI).
3. Set env vars in Vercel (see `.env.example`): `AUTH_SECRET`, `CREDENTIAL_KEY_V1` (store a copy in a password manager — losing it makes undelivered credentials unrecoverable), `ADMIN_EMAILS`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ZELLE_RECIPIENT_NAME`, `ZELLE_RECIPIENT_HANDLE`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (optional, enables admin push alerts — generate with `npx web-push generate-vapid-keys`).
4. Add the Stripe webhook endpoint `→ /api/webhooks/stripe` (events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`) and paste its signing secret into `STRIPE_WEBHOOK_SECRET`.
5. `vercel.json` already schedules the daily Zelle-expiry cron; Vercel sends `CRON_SECRET` as the bearer token.

## Payment note

The payment layer is an interface (`src/lib/payments/provider.ts`); Stripe and Zelle are independent rails and all order/margin/commission state lives in our DB, so a Stripe pause never freezes the business. The admin reporting page surfaces the Stripe/Zelle revenue mix so processor concentration stays visible.

## Before launch

- Replace the **sample testimonials** (seeded, flagged `[SAMPLE]`) with real customer quotes in Admin → Testimonials.
- Set the real Zelle recipient details.
- Point `APP_URL` / `EMAIL_FROM` at your domain.
