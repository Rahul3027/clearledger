import { pgTable, text, timestamp, uuid, integer, jsonb, unique, boolean } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const connectorDefinitions = pgTable("connector_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  authType: text("auth_type").notNull(), // OAUTH2, API_KEY, BASIC
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectorInstances = pgTable("connector_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  connectorDefinitionId: uuid("connector_definition_id").notNull().references(() => connectorDefinitions.id, { onDelete: "cascade" }),
  
  status: text("status", { enum: ["ACTIVE", "ERROR", "PAUSED"] }).notNull().default("ACTIVE"),
  healthStatus: text("health_status", { enum: ["HEALTHY", "DEGRADED", "DOWN"] }).notNull().default("HEALTHY"),
  
  configuration: jsonb("configuration"),
  encryptedCredentials: text("encrypted_credentials"),
  syncCursor: jsonb("sync_cursor"),
  
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"), // UUID of worker holding the lock
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  connectorInstanceId: uuid("connector_instance_id").notNull().references(() => connectorInstances.id, { onDelete: "cascade" }),
  
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED", "FAILED"] }).notNull().default("IN_PROGRESS"),
  syncType: text("sync_type", { enum: ["FULL", "INCREMENTAL"] }).notNull(),
  
  recordsProcessed: integer("records_processed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  
  provider: text("provider").notNull(),
  externalEventId: text("external_event_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  
  payload: jsonb("payload").notNull(),
  status: text("status", { enum: ["PENDING", "PROCESSED", "FAILED", "DEAD_LETTER"] }).notNull().default("PENDING"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => {
  return {
    uniqueProviderEvent: unique("webhook_events_unique_idx").on(table.provider, table.externalEventId)
  };
});

export const notificationEvents = pgTable("notification_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  
  channel: text("channel", { enum: ["EMAIL", "IN_APP"] }).notNull(),
  recipient: text("recipient").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status", { enum: ["PENDING", "SENT", "FAILED"] }).notNull().default("PENDING"),
  
  dedupeKey: text("dedupe_key").unique(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  conditions: jsonb("conditions"), // Condition AST
  
  actionType: text("action_type", { enum: ["CREATE_EXCEPTION", "SEND_NOTIFICATION", "START_SYNC"] }).notNull(),
  actionPayload: jsonb("action_payload").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  
  version: integer("version").notNull().default(1),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
