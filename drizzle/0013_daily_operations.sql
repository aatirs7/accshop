CREATE TYPE "public"."op_fulfillment_status" AS ENUM('pending', 'in_progress', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "daily_fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"op_date" date NOT NULL,
	"customer_name" text NOT NULL,
	"item" text NOT NULL,
	"quantity" integer,
	"notes" text,
	"status" "op_fulfillment_status" DEFAULT 'pending' NOT NULL,
	"fulfilled_on" date,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"note_key" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"op_date" date NOT NULL,
	"description" text NOT NULL,
	"priority" "task_priority",
	"done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_fulfillments" ADD CONSTRAINT "daily_fulfillments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_fulfillments_op_date_idx" ON "daily_fulfillments" USING btree ("op_date");--> statement-breakpoint
CREATE INDEX "daily_fulfillments_fulfilled_on_idx" ON "daily_fulfillments" USING btree ("fulfilled_on");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_notes_note_key_unique" ON "daily_notes" USING btree ("note_key");--> statement-breakpoint
CREATE INDEX "daily_tasks_op_date_idx" ON "daily_tasks" USING btree ("op_date");