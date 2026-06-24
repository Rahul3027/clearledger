-- Description: Phase 6 — Integrations & Automation Layer schema
-- Adds connector registry, sync execution, webhooks, notifications, and automation rules.

CREATE TABLE IF NOT EXISTS "connector_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"auth_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "connector_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
	"connector_definition_id" uuid NOT NULL REFERENCES "connector_definitions"("id") ON DELETE cascade,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"health_status" text DEFAULT 'HEALTHY' NOT NULL,
	"configuration" jsonb,
	"encrypted_credentials" text,
	"sync_cursor" jsonb,
	"last_sync_at" timestamp with time zone,
	"next_sync_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
	"connector_instance_id" uuid NOT NULL REFERENCES "connector_instances"("id") ON DELETE cascade,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"sync_type" text NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_unique_idx" ON "webhook_events" ("provider", "external_event_id");

CREATE TABLE IF NOT EXISTS "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"dedupe_key" text UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"conditions" jsonb,
	"action_type" text NOT NULL,
	"action_payload" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "connector_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;

-- Policies for globally readable connector definitions
CREATE POLICY "definitions_read" ON "connector_definitions" FOR SELECT USING (true);

-- RLS Policies for Tenant Isolation

CREATE POLICY "tenant_read_connector_instances" ON "connector_instances" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_connector_instances" ON "connector_instances" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "tenant_read_sync_runs" ON "sync_runs" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_sync_runs" ON "sync_runs" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "tenant_read_webhook_events" ON "webhook_events" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_webhook_events" ON "webhook_events" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "tenant_read_notification_events" ON "notification_events" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_notification_events" ON "notification_events" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "tenant_read_automation_rules" ON "automation_rules" FOR SELECT TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY "tenant_write_automation_rules" ON "automation_rules" FOR ALL TO "app_role" USING (org_id = current_setting('app.current_org_id', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
