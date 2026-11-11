CREATE TABLE "promo_code_settings" (
	"code" text PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
