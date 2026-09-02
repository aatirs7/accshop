-- Hand-issued referral partner: code SIEBECKER, 15% commission on attributed
-- sales. Idempotent (no-op if the code already exists) since startup
-- migrations can run against a DB that already has it.
WITH new_user AS (
	INSERT INTO "users" ("id", "name", "email", "role")
	SELECT gen_random_uuid()::text, 'Siebecker', 'siebecker@accshop.referral', 'partner'
	WHERE NOT EXISTS (SELECT 1 FROM "partners" WHERE "referral_code" = 'SIEBECKER')
	RETURNING "id"
)
INSERT INTO "partners" ("id", "user_id", "business_name", "status", "commission_rate_bps", "referral_code", "approved_at")
SELECT gen_random_uuid()::text, "id", 'Siebecker', 'approved', 1500, 'SIEBECKER', now()
FROM new_user;
