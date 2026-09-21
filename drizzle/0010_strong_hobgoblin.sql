CREATE TABLE "replacements" (
	"id" text PRIMARY KEY NOT NULL,
	"accounts" integer NOT NULL,
	"cost_cents" integer NOT NULL,
	"replaced_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replacements" ADD CONSTRAINT "replacements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "replacements_replaced_at_idx" ON "replacements" USING btree ("replaced_at");