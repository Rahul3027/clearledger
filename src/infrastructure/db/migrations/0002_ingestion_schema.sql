CREATE TABLE "canonical_transactions" (
	"platform_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"stable_identity_key" text NOT NULL UNIQUE,
	"source_connector_id" text NOT NULL,
	"source_record_id" text,
	"domain_id" text NOT NULL,
	"dataset_label" text NOT NULL,
	"doc_type" text NOT NULL,
	"doc_number" text NOT NULL,
	"doc_date" date NOT NULL,
	"period_key" text NOT NULL,
	"counterparty_name" text,
	"counterparty_tax_id" text,
	"counterparty_id" text,
	"currency_code" text NOT NULL,
	"exchange_rate" numeric NOT NULL,
	"net_amount" numeric NOT NULL,
	"tax_amount" numeric,
	"gross_amount" numeric NOT NULL,
	"base_net_amount" numeric NOT NULL,
	"base_tax_amount" numeric,
	"base_gross_amount" numeric NOT NULL,
	"account_code" text,
	"cost_centre" text,
	"reference_doc_number" text,
	"line_items" jsonb,
	"custom_fields" jsonb,
	"data_quality_score" integer,
	"peppol_sig_status" text,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ingested_by" text NOT NULL,
	"is_pii_masked" boolean DEFAULT false NOT NULL
);

CREATE TABLE "connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"connector_type" text NOT NULL,
	"auth_scheme" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'UNCONFIGURED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"rows_extracted" integer DEFAULT 0,
	"rows_mapped" integer DEFAULT 0,
	"rows_quarantined" integer DEFAULT 0,
	"rows_rejected" integer DEFAULT 0,
	"error_details" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "canonical_transactions" ADD CONSTRAINT "canonical_transactions_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "canonical_transactions" ADD CONSTRAINT "canonical_transactions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_org_id_organisations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;

-- RLS
ALTER TABLE "canonical_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "canonical_transactions" FORCE ROW LEVEL SECURITY;
CREATE POLICY canonical_transactions_read ON "canonical_transactions" FOR SELECT USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY canonical_transactions_write ON "canonical_transactions" FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY canonical_transactions_update ON "canonical_transactions" FOR UPDATE USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY canonical_transactions_delete ON "canonical_transactions" FOR DELETE USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "connectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connectors" FORCE ROW LEVEL SECURITY;
CREATE POLICY connectors_read ON "connectors" FOR SELECT USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY connectors_write ON "connectors" FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY connectors_update ON "connectors" FOR UPDATE USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY connectors_delete ON "connectors" FOR DELETE USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "extraction_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "extraction_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY extraction_jobs_read ON "extraction_jobs" FOR SELECT USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY extraction_jobs_write ON "extraction_jobs" FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY extraction_jobs_update ON "extraction_jobs" FOR UPDATE USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY extraction_jobs_delete ON "extraction_jobs" FOR DELETE USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canonical_transactions_org_id ON "canonical_transactions"(org_id);
CREATE INDEX IF NOT EXISTS idx_connectors_org_id ON "connectors"(org_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_org_id ON "extraction_jobs"(org_id);
