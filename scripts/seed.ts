/**
 * Dev seed: sample catalog, users, and orders in every pipeline state so the
 * dashboard and admin CRM can be built and demoed against realistic data.
 * Run: npm run db:seed
 */
import { db } from "@/lib/db";
import {
  credentials,
  deliverables,
  orders,
  partnerPricingRules,
  partners,
  payments,
  products,
  suppliers,
  testimonials,
  users,
} from "@/lib/db/schema";
import { adminEmails } from "@/lib/env";
import { encryptCredential, credentialFingerprint } from "@/lib/crypto/credentials";
import { generateOrderCode } from "@/lib/orders/code";
import { eq } from "drizzle-orm";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function upsertUser(email: string, name: string, role: "customer" | "partner" | "admin") {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;
  const [row] = await db.insert(users).values({ email, name, role }).returning();
  return row;
}

async function main() {
  // --- catalog -------------------------------------------------------------
  let product = await db.query.products.findFirst({ where: eq(products.slug, "tiktok-affiliate-100k") });
  if (!product) {
    [product] = await db
      .insert(products)
      .values({
        slug: "tiktok-affiliate-100k",
        name: "TikTok Affiliate Account, 100K Tier",
        tierLabel: "100K",
        followerMin: 100_000,
        retailPriceCents: 55_000,
        description:
          "Established TikTok account with 100,000+ real followers, eligible for TikTok Shop Affiliate. Aged, warmed, and sourced for low ban risk. Delivered with full credentials, linked email, and our step-by-step warmup guide.",
        sort: 0,
      })
      .returning();
  }

  let supplier = await db.query.suppliers.findFirst({ where: eq(suppliers.name, "Primary Supplier") });
  if (!supplier) {
    [supplier] = await db
      .insert(suppliers)
      .values({
        name: "Primary Supplier",
        contactHandle: "@primary_supplier",
        defaultCostCents: 18_000,
        notes: "Main source for 100K tier accounts.",
      })
      .returning();
  }

  // --- users ---------------------------------------------------------------
  for (const email of adminEmails) await upsertUser(email, "Owner", "admin");
  const customer = await upsertUser("demo.customer@example.com", "Demo Customer", "customer");
  const partnerUser = await upsertUser("demo.partner@example.com", "Azam (Demo Partner)", "partner");

  let partner = await db.query.partners.findFirst({ where: eq(partners.userId, partnerUser.id) });
  if (!partner) {
    [partner] = await db
      .insert(partners)
      .values({
        userId: partnerUser.id,
        businessName: "TTS Mentorship (Demo)",
        commissionRateBps: 1000,
        approvedAt: daysAgo(60),
        notes: "Demo of an Azam-style bulk partner: weekly bulk orders + 10% referral commission.",
      })
      .returning();
    await db.insert(partnerPricingRules).values([
      { partnerId: partner.id, productId: product.id, minQty: 10, unitPriceCents: 40_000 },
      { partnerId: partner.id, productId: product.id, minQty: 20, unitPriceCents: 36_000 },
    ]);
  }

  // --- testimonials (SAMPLE ONLY, replace with real customer quotes) ------
  const existingTestimonials = await db.query.testimonials.findMany();
  if (existingTestimonials.length === 0) {
    await db.insert(testimonials).values([
      {
        authorName: "Sample Testimonial",
        authorHandle: "@replace_me",
        content:
          "[SAMPLE, replace with a real customer quote before launch] Account was delivered within a day with clean credentials and the warmup guide made onboarding easy.",
        rating: 5,
        source: "sample",
        featured: true,
        sort: 0,
      },
      {
        authorName: "Sample Testimonial 2",
        authorHandle: "@replace_me_2",
        content:
          "[SAMPLE, replace with a real customer quote before launch] Ordered 10 accounts for my students, all delivered in 48 hours with warranty.",
        rating: 5,
        source: "sample",
        featured: true,
        sort: 1,
      },
      {
        authorName: "Sample Testimonial 3",
        authorHandle: "@replace_me_3",
        content:
          "[SAMPLE, replace with a real customer quote before launch] Support replaced an account under warranty with zero hassle.",
        rating: 5,
        source: "sample",
        featured: false,
        sort: 2,
      },
    ]);
  }

  // --- demo orders in each pipeline state ----------------------------------
  const existingOrders = await db.query.orders.findMany();
  if (existingOrders.length === 0) {
    const admin = await db.query.users.findFirst({ where: eq(users.role, "admin") });
    const mkOrder = async (opts: {
      userId: string;
      partnerId?: string;
      qty: number;
      unit: number;
      method: "stripe" | "zelle";
      paymentStatus: "pending" | "paid";
      fulfillment: "sourcing" | "credentials_ready" | "delivered";
      paidDaysAgo?: number;
      deliveredDaysAgo?: number;
      source?: "retail" | "partner";
    }) => {
      const [order] = await db
        .insert(orders)
        .values({
          orderCode: generateOrderCode(),
          userId: opts.userId,
          partnerId: opts.partnerId,
          productId: product.id,
          quantity: opts.qty,
          unitPriceCents: opts.unit,
          totalCents: opts.qty * opts.unit,
          paymentMethod: opts.method,
          paymentStatus: opts.paymentStatus,
          fulfillmentStatus: opts.fulfillment,
          source: opts.source ?? "retail",
          paidAt: opts.paidDaysAgo != null ? daysAgo(opts.paidDaysAgo) : null,
          deliveredAt: opts.deliveredDaysAgo != null ? daysAgo(opts.deliveredDaysAgo) : null,
          createdAt: daysAgo((opts.paidDaysAgo ?? 0) + 1),
        })
        .returning();
      if (opts.paymentStatus === "paid") {
        await db.insert(payments).values({
          orderId: order.id,
          method: opts.method,
          amountCents: order.totalCents,
          zelleReference: opts.method === "zelle" ? "demo-ref" : null,
          confirmedBy: opts.method === "zelle" ? admin?.id : null,
        });
        for (let i = 0; i < opts.qty; i++) {
          const [d] = await db
            .insert(deliverables)
            .values({
              orderId: order.id,
              supplierId: opts.fulfillment === "sourcing" ? null : supplier.id,
              costCents: opts.fulfillment === "sourcing" ? null : 18_000,
              status:
                opts.fulfillment === "sourcing"
                  ? "pending"
                  : opts.fulfillment === "credentials_ready"
                    ? "ready"
                    : "delivered",
              deliveredAt: opts.deliveredDaysAgo != null ? daysAgo(opts.deliveredDaysAgo) : null,
            })
            .returning();
          if (opts.fulfillment !== "sourcing" && admin) {
            const payload = {
              fields: [
                { label: "TikTok username", value: `demo_account_${i + 1}` },
                { label: "TikTok password", value: "Demo-Password-123!" },
                { label: "Linked email", value: `demo${i + 1}@example.com` },
                { label: "Email password", value: "Demo-Email-Pass-456!" },
              ],
              notes: "Demo credentials, not a real account.",
            };
            const enc = encryptCredential(payload, d.id);
            await db.insert(credentials).values({
              deliverableId: d.id,
              ciphertext: enc.ciphertext,
              iv: enc.iv,
              authTag: enc.authTag,
              keyVersion: enc.keyVersion,
              fingerprint: credentialFingerprint(payload),
              createdBy: admin.id,
            });
          }
        }
      }
      return order;
    };

    await mkOrder({ userId: customer.id, qty: 1, unit: 55_000, method: "zelle", paymentStatus: "pending", fulfillment: "sourcing" });
    await mkOrder({ userId: customer.id, qty: 1, unit: 55_000, method: "stripe", paymentStatus: "paid", fulfillment: "sourcing", paidDaysAgo: 1 });
    await mkOrder({ userId: customer.id, qty: 1, unit: 55_000, method: "stripe", paymentStatus: "paid", fulfillment: "credentials_ready", paidDaysAgo: 2 });
    await mkOrder({ userId: customer.id, qty: 1, unit: 55_000, method: "stripe", paymentStatus: "paid", fulfillment: "delivered", paidDaysAgo: 10, deliveredDaysAgo: 8 });
    await mkOrder({ userId: customer.id, qty: 1, unit: 55_000, method: "zelle", paymentStatus: "paid", fulfillment: "delivered", paidDaysAgo: 45, deliveredDaysAgo: 40 });
    await mkOrder({ userId: partnerUser.id, partnerId: partner.id, qty: 10, unit: 40_000, method: "zelle", paymentStatus: "paid", fulfillment: "delivered", paidDaysAgo: 7, deliveredDaysAgo: 5, source: "partner" });
  }

  console.log("Seed complete.");
}

main().then(() => process.exit(0));
