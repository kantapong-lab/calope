DROP INDEX "consent_one_open_per_user";
CREATE UNIQUE INDEX "consent_one_active_per_user" ON "consent_records" USING btree ("user_id") WHERE "consent_records"."withdrawn_at" is null;
ALTER TABLE "consent_records" DROP COLUMN "superseded_at";
