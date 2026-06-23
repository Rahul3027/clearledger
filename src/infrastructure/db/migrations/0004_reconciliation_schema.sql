CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"initiated_by" text NOT NULL
);

CREATE TABLE "reconciliation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"source_platform_id" uuid NOT NULL,
	"target_platform_id" uuid,
	"match_status" text NOT NULL,
	"strategy_used" text,
	"confidence_score" numeric,
	"amount_variance" numeric,
	"evidence_trail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by" text
);

ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_run_id_reconciliation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reconciliation_runs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_source_platform_id_canonical_transactions_platform_id_fk" FOREIGN KEY ("source_platform_id") REFERENCES "public"."canonical_transactions"("platform_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_target_platform_id_canonical_transactions_platform_id_fk" FOREIGN KEY ("target_platform_id") REFERENCES "public"."canonical_transactions"("platform_id") ON DELETE cascade ON UPDATE no action;

-- Constraints
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_source_idx" UNIQUE("period_key", "source_platform_id");
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_target_idx" UNIQUE("period_key", "target_platform_id");

-- Tenancy enforcement
ALTER TABLE "reconciliation_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reconciliation_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_reconciliation_runs" ON "reconciliation_runs" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_reconciliation_runs" ON "reconciliation_runs" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "reconciliation_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reconciliation_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_reconciliation_results" ON "reconciliation_results" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_reconciliation_results" ON "reconciliation_results" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
