CREATE TABLE "evidence_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"storage_path" text,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);

ALTER TABLE "evidence_packages" ADD CONSTRAINT "ep_org_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade;

-- RLS Enablement
ALTER TABLE "evidence_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_packages" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_ep" ON "evidence_packages" 
FOR SELECT TO "app_role" 
USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "tenant_write_ep" ON "evidence_packages" 
FOR ALL TO "app_role" 
USING (org_id = current_setting('app.current_org_id', true)::uuid) 
WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes for Dashboard Aggregation
CREATE INDEX "idx_evidence_pkg" ON "evidence_packages" ("org_id", "period_key");
CREATE INDEX "idx_cases_sla" ON "exception_cases" ("org_id", "sla_target_at", "resolved_at");
CREATE INDEX "idx_audit_resource" ON "audit_outbox" ("org_id", "resource_id");
