CREATE TABLE "manual_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"profit_cents" integer DEFAULT 0 NOT NULL,
	"sold_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manual_orders" ADD CONSTRAINT "manual_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_orders_sold_at_idx" ON "manual_orders" USING btree ("sold_at");
