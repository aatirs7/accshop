CREATE TABLE "bulk_sales" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_name" text NOT NULL,
	"accounts" integer NOT NULL,
	"revenue_cents" integer NOT NULL,
	"profit_cents" integer NOT NULL,
	"sold_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bulk_sales" ADD CONSTRAINT "bulk_sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bulk_sales_sold_at_idx" ON "bulk_sales" USING btree ("sold_at");