CREATE TABLE "stock_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"product_id" text NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"iv" "bytea" NOT NULL,
	"auth_tag" "bytea" NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"fingerprint" text,
	"used" boolean DEFAULT false NOT NULL,
	"used_by_deliverable_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "stock_accounts" ADD CONSTRAINT "stock_accounts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_accounts" ADD CONSTRAINT "stock_accounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_accounts" ADD CONSTRAINT "stock_accounts_used_by_deliverable_id_deliverables_id_fk" FOREIGN KEY ("used_by_deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_accounts_product_idx" ON "stock_accounts" USING btree ("product_id","used");--> statement-breakpoint
CREATE INDEX "stock_accounts_supplier_idx" ON "stock_accounts" USING btree ("supplier_id");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_access_token_unique" UNIQUE("access_token");