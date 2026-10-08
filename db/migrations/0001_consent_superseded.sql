DROP INDEX "consent_one_active_per_user";--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_one_open_per_user" ON "consent_records" USING btree ("user_id") WHERE "consent_records"."withdrawn_at" is null and "consent_records"."superseded_at" is null;