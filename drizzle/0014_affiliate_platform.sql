CREATE TYPE "public"."affiliate_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'approved';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'reversed';--> statement-breakpoint
CREATE TABLE "affiliate_live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"affiliate_id" text NOT NULL,
	"session_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"incoming_dms" integer DEFAULT 0 NOT NULL,
	"qualified_leads" integer DEFAULT 0 NOT NULL,
	"common_questions" text,
	"technical_issues" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD COLUMN "reversed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD COLUMN "reversal_reason" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "payout_method" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "payout_handle" text;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "status" "affiliate_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "weekly_live_hours_goal" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliates" ADD COLUMN "weekly_live_sessions_goal" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_live_sessions" ADD CONSTRAINT "affiliate_live_sessions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aff_live_affiliate_date_idx" ON "affiliate_live_sessions" USING btree ("affiliate_id","session_date");--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_username_unique" UNIQUE("username");