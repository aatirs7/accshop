import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ulid } from "ulid";
import type { AdapterAccountType } from "next-auth/adapters";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => ulid());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["customer", "partner", "admin"]);
export const paymentMethod = pgEnum("payment_method", ["stripe", "zelle"]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
  "cancelled",
]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "sourcing",
  "credentials_ready",
  "delivered",
]);
export const orderSource = pgEnum("order_source", [
  "retail",
  "partner",
  "referral",
]);
export const deliverableStatus = pgEnum("deliverable_status", [
  "pending",
  "ready",
  "delivered",
  "replaced",
]);
export const partnerStatus = pgEnum("partner_status", [
  "approved",
  "suspended",
]);
export const commissionStatus = pgEnum("commission_status", [
  "accrued",
  "paid",
]);
export const applicationStatus = pgEnum("application_status", [
  "new",
  "in_review",
  "approved",
  "rejected",
]);
export const inquiryStatus = pgEnum("inquiry_status", [
  "new",
  "contacted",
  "converted",
  "closed",
]);
export const claimStatus = pgEnum("claim_status", [
  "open",
  "in_review",
  "replaced",
  "refunded",
  "denied",
]);
export const stockLevel = pgEnum("stock_level", [
  "high",
  "low",
  "extremely_low",
]);
export const submissionStatus = pgEnum("submission_status", [
  "new",
  "approved",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Users + Auth.js adapter tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", {
    withTimezone: true,
    mode: "date",
  }),
  image: text("image"),
  role: userRole("role").notNull().default("customer"),
  createdAt: createdAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------------------------------------------------------------------------
// Catalog + suppliers
// ---------------------------------------------------------------------------

export const products = pgTable("products", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tierLabel: text("tier_label").notNull(),
  followerMin: integer("follower_min").notNull(),
  description: text("description").notNull().default(""),
  retailPriceCents: integer("retail_price_cents").notNull(),
  // Strikethrough "was $X" anchor price; null hides it.
  compareAtPriceCents: integer("compare_at_price_cents"),
  // Scarcity signal shown on the product page; manually curated, not live inventory.
  stockLabel: stockLevel("stock_label").notNull().default("high"),
  // Primary card image for carousels/catalog; product_images holds the gallery.
  screenshotUrl: text("screenshot_url"),
  featured: boolean("featured").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Added to the resolved unit price when selected; can be 0.
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_variants_product_idx").on(t.productId)],
);

export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  contactHandle: text("contact_handle"),
  defaultCostCents: integer("default_cost_cents"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export const partners = pgTable("partners", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  businessName: text("business_name").notNull(),
  status: partnerStatus("status").notNull().default("approved"),
  // referral commission on orders attributed to this partner; null = bulk-pricing-only partner
  commissionRateBps: integer("commission_rate_bps"),
  notes: text("notes"),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
});

export const partnerPricingRules = pgTable(
  "partner_pricing_rules",
  {
    id: id(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    minQty: integer("min_qty").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("pricing_rule_unique").on(t.partnerId, t.productId, t.minQty),
  ],
);

// ---------------------------------------------------------------------------
// Orders + fulfillment
// ---------------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderCode: text("order_code").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    partnerId: text("partner_id").references(() => partners.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    // Chosen variant (e.g. "Enable TikTok Shop"); label snapshotted for history.
    variantId: text("variant_id"),
    variantLabel: text("variant_label"),
    // One-time email-capture discount applied at checkout.
    discountCode: text("discount_code"),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    fulfillmentStatus: fulfillmentStatus("fulfillment_status")
      .notNull()
      .default("sourcing"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    zelleReference: text("zelle_reference"),
    source: orderSource("source").notNull().default("retail"),
    adminNotes: text("admin_notes"),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_payment_idx").on(t.paymentStatus, t.paymentMethod),
    index("orders_partner_idx").on(t.partnerId),
  ],
);

export const deliverables = pgTable(
  "deliverables",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id").references(() => suppliers.id),
    costCents: integer("cost_cents"),
    status: deliverableStatus("status").notNull().default("pending"),
    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
      mode: "date",
    }),
    replacesDeliverableId: text("replaces_deliverable_id"),
    createdAt: createdAt(),
  },
  (t) => [index("deliverables_order_idx").on(t.orderId)],
);

export const credentials = pgTable("credentials", {
  id: id(),
  deliverableId: text("deliverable_id")
    .notNull()
    .unique()
    .references(() => deliverables.id, { onDelete: "cascade" }),
  ciphertext: bytea("ciphertext").notNull(),
  iv: bytea("iv").notNull(),
  authTag: bytea("auth_tag").notNull(),
  keyVersion: integer("key_version").notNull().default(1),
  // last 4 chars of the login identifier, for admin UI display without decryption
  fingerprint: text("fingerprint"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  firstRevealedAt: timestamp("first_revealed_at", {
    withTimezone: true,
    mode: "date",
  }),
  revealCount: integer("reveal_count").notNull().default(0),
  revealLocked: boolean("reveal_locked").notNull().default(false),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  method: paymentMethod("method").notNull(),
  amountCents: integer("amount_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  zelleReference: text("zelle_reference"),
  confirmedBy: text("confirmed_by").references(() => users.id),
  confirmedAt: timestamp("confirmed_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
});

export const commissions = pgTable(
  "commissions",
  {
    id: id(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.id),
    orderId: text("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    amountCents: integer("amount_cents").notNull(),
    status: commissionStatus("status").notNull().default("accrued"),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [index("commissions_partner_idx").on(t.partnerId, t.status)],
);

// ---------------------------------------------------------------------------
// Inbound queues
// ---------------------------------------------------------------------------

export const partnerApplications = pgTable("partner_applications", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  tiktokHandle: text("tiktok_handle").notNull(),
  otherSocials: text("other_socials"),
  estWeeklyVolume: text("est_weekly_volume"),
  message: text("message"),
  status: applicationStatus("status").notNull().default("new"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
});

export const bulkInquiries = pgTable("bulk_inquiries", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  quantityInterest: text("quantity_interest"),
  message: text("message"),
  status: inquiryStatus("status").notNull().default("new"),
  createdAt: createdAt(),
});

export const warrantyClaims = pgTable("warranty_claims", {
  id: id(),
  deliverableId: text("deliverable_id")
    .notNull()
    .references(() => deliverables.id),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: claimStatus("status").notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  replacementDeliverableId: text("replacement_deliverable_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Content + operational
// ---------------------------------------------------------------------------

export const testimonials = pgTable("testimonials", {
  id: id(),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle"),
  headline: text("headline"),
  content: text("content").notNull(),
  rating: integer("rating").notNull().default(5),
  source: text("source"),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

// Post-delivery testimonial requests + admin review queue. Approving copies
// into `testimonials` (published).
export const testimonialSubmissions = pgTable("testimonial_submissions", {
  id: id(),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle"),
  headline: text("headline"),
  content: text("content").notNull(),
  rating: integer("rating").notNull().default(5),
  orderCode: text("order_code"),
  status: submissionStatus("status").notNull().default("new"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
});

// Email-capture popup leads + their one-time discount codes.
export const emailCaptures = pgTable("email_captures", {
  id: id(),
  email: text("email").notNull(),
  discountCode: text("discount_code").notNull().unique(),
  discountAmountCents: integer("discount_amount_cents").notNull().default(1000),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true, mode: "date" }),
  source: text("source").notNull().default("popup"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorUserId: text("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)],
);

export const webhookEvents = pgTable("webhook_events", {
  id: id(),
  provider: text("provider").notNull(),
  externalEventId: text("external_event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  partner: one(partners, { fields: [users.id], references: [partners.userId] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orders: many(orders),
  images: many(productImages),
  variants: many(productVariants),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, { fields: [partners.userId], references: [users.id] }),
  pricingRules: many(partnerPricingRules),
  commissions: many(commissions),
  orders: many(orders),
}));

export const partnerPricingRulesRelations = relations(
  partnerPricingRules,
  ({ one }) => ({
    partner: one(partners, {
      fields: [partnerPricingRules.partnerId],
      references: [partners.id],
    }),
    product: one(products, {
      fields: [partnerPricingRules.productId],
      references: [products.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  partner: one(partners, {
    fields: [orders.partnerId],
    references: [partners.id],
  }),
  deliverables: many(deliverables),
  payments: many(payments),
  commission: one(commissions, {
    fields: [orders.id],
    references: [commissions.orderId],
  }),
  claims: many(warrantyClaims),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  order: one(orders, {
    fields: [deliverables.orderId],
    references: [orders.id],
  }),
  supplier: one(suppliers, {
    fields: [deliverables.supplierId],
    references: [suppliers.id],
  }),
  credential: one(credentials, {
    fields: [deliverables.id],
    references: [credentials.deliverableId],
  }),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  deliverable: one(deliverables, {
    fields: [credentials.deliverableId],
    references: [deliverables.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  partner: one(partners, {
    fields: [commissions.partnerId],
    references: [partners.id],
  }),
  order: one(orders, {
    fields: [commissions.orderId],
    references: [orders.id],
  }),
}));

export const warrantyClaimsRelations = relations(warrantyClaims, ({ one }) => ({
  deliverable: one(deliverables, {
    fields: [warrantyClaims.deliverableId],
    references: [deliverables.id],
  }),
  order: one(orders, {
    fields: [warrantyClaims.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [warrantyClaims.userId],
    references: [users.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  deliverables: many(deliverables),
}));
