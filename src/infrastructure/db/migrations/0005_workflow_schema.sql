CREATE TABLE "exception_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"source_platform_id" uuid NOT NULL,
	"reconciliation_result_id" uuid,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"sla_target_at" timestamp with time zone
);

CREATE TABLE "exception_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"content_text" text NOT NULL,
	"comment_type" text DEFAULT 'INTERNAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "exception_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"uploader_id" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "exception_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action_type" text NOT NULL,
	"previous_state" text,
	"new_state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign Keys
ALTER TABLE "exception_cases" ADD CONSTRAINT "ec_org_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade;
ALTER TABLE "exception_cases" ADD CONSTRAINT "ec_src_fk" FOREIGN KEY ("source_platform_id") REFERENCES "public"."canonical_transactions"("platform_id") ON DELETE cascade;
ALTER TABLE "exception_cases" ADD CONSTRAINT "ec_rec_fk" FOREIGN KEY ("reconciliation_result_id") REFERENCES "public"."reconciliation_results"("id") ON DELETE set null;

ALTER TABLE "exception_comments" ADD CONSTRAINT "ecom_org_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade;
ALTER TABLE "exception_comments" ADD CONSTRAINT "ecom_case_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exception_cases"("id") ON DELETE cascade;

ALTER TABLE "exception_attachments" ADD CONSTRAINT "eatt_org_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade;
ALTER TABLE "exception_attachments" ADD CONSTRAINT "eatt_case_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exception_cases"("id") ON DELETE cascade;

ALTER TABLE "exception_history" ADD CONSTRAINT "ehist_org_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE cascade;
ALTER TABLE "exception_history" ADD CONSTRAINT "ehist_case_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exception_cases"("id") ON DELETE cascade;

-- RLS Enablement
ALTER TABLE "exception_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exception_cases" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_ec" ON "exception_cases" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_ec" ON "exception_cases" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "exception_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exception_comments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_ecom" ON "exception_comments" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_ecom" ON "exception_comments" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "exception_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exception_attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_eatt" ON "exception_attachments" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_eatt" ON "exception_attachments" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "exception_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exception_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read_ehist" ON "exception_history" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_ehist" ON "exception_history" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
