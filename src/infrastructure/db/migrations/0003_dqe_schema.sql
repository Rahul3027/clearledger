ALTER TABLE "canonical_transactions" ADD COLUMN "dq_action" text DEFAULT 'QUARANTINED' NOT NULL;
ALTER TABLE "canonical_transactions" ADD COLUMN "normalization_warnings" jsonb;

CREATE TABLE "dq_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"score" numeric NOT NULL,
	"action" text NOT NULL,
	"rules_evaluated" jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "dq_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "dq_results" ADD CONSTRAINT "dq_results_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dq_results" ADD CONSTRAINT "dq_results_platform_id_canonical_transactions_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."canonical_transactions"("platform_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dq_reviews" ADD CONSTRAINT "dq_reviews_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dq_reviews" ADD CONSTRAINT "dq_reviews_platform_id_canonical_transactions_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."canonical_transactions"("platform_id") ON DELETE cascade ON UPDATE no action;

-- Tenancy enforcement
ALTER TABLE "dq_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dq_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_dq_results" ON "dq_results" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_dq_results" ON "dq_results" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "dq_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dq_reviews" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_dq_reviews" ON "dq_reviews" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_dq_reviews" ON "dq_reviews" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
