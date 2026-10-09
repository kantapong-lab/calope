CREATE TABLE "accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "analysis_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dish_name_th" text NOT NULL,
	"dish_name_en" text,
	"portion_grams" integer NOT NULL,
	"kcal_low" integer NOT NULL,
	"kcal_high" integer NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_logs_portion_grams_check" CHECK ("meal_logs"."portion_grams" between 1 and 5000),
	CONSTRAINT "meal_logs_kcal_low_check" CHECK ("meal_logs"."kcal_low" between 0 and 5000),
	CONSTRAINT "meal_logs_kcal_high_check" CHECK ("meal_logs"."kcal_high" between "meal_logs"."kcal_low" and 5000),
	CONSTRAINT "meal_logs_source_check" CHECK ("meal_logs"."source" in ('ai','manual'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_events_user_created" ON "analysis_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_one_active_per_user" ON "consent_records" USING btree ("user_id") WHERE "consent_records"."withdrawn_at" is null;--> statement-breakpoint
CREATE INDEX "meal_logs_user_created" ON "meal_logs" USING btree ("user_id","created_at" DESC NULLS LAST);