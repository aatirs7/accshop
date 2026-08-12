CREATE TYPE "public"."stock_level" AS ENUM('high', 'low', 'extremely_low');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "email_captures" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"discount_code" text NOT NULL,
	"discount_amount_cents" integer DEFAULT 1000 NOT NULL,
	"redeemed_at" timestamp with time zone,
	"source" text DEFAULT 'popup' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_captures_discount_code_unique" UNIQUE("discount_code")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"label" text NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonial_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"author_name" text NOT NULL,
	"author_handle" text,
	"headline" text,
	"content" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"order_code" text,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"reviewed_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variant_label" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "compare_at_price_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_label" "stock_level" DEFAULT 'high' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "screenshot_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonial_submissions" ADD CONSTRAINT "testimonial_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");