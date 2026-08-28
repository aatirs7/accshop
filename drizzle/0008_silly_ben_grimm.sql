CREATE TABLE "account_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"iv" "bytea" NOT NULL,
	"auth_tag" "bytea" NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "submit_token" text;--> statement-breakpoint
ALTER TABLE "account_stock" ADD CONSTRAINT "account_stock_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_stock_supplier_idx" ON "account_stock" USING btree ("supplier_id");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_submit_token_unique" UNIQUE("submit_token");