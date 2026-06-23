import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * AUDIT EVENTS — APPEND-ONLY IMMUTABLE TABLE
 *
 * Enforcement (applied via SQL migration):
 *   1. DB privilege: INSERT-only for app_role; no UPDATE/DELETE ever granted
 *   2. Trigger: BEFORE UPDATE OR DELETE → RAISE SQLSTATE '45000'
 *   3. Application: AuditLedgerService.append() is the only write path
 *
 * Hash chain: each row's prev_event_hash = SHA-256(canonical JSON of previous
 * event in the same org sequence). First event per org uses SHA-256(org_id||':GENESIS').
 */
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  entityId: uuid("entity_id"), // nullable for org-level events
  actorId: text("actor_id").notNull(), // user_id OR system job ID
  actorType: text("actor_type", { enum: ["USER", "SYSTEM"] }).notNull(),
  eventType: text("event_type").notNull(),
  // e.g. CREATE | UPDATE | STATE_CHANGE | DELETE | LOGIN | LOGOUT |
  //      RULE_ACTIVATED | PERIOD_CLOSED | EXCEPTION_RESOLVED | OVERRIDE
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  // SHA-256 of the previous event in this org's sequence
  prevEventHash: text("prev_event_hash").notNull(),
  // PII: stored as-is; 7-year retention
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Set by DB server clock via DEFAULT now() — not by application
  ts: timestamp("ts", { withTimezone: true, precision: 6 })
    .notNull()
    .defaultNow(),
});

/**
 * AUDIT OUTBOX — transactional staging table for audit events.
 *
 * Business transactions write to this table atomically alongside the
 * business record. A pg_cron job (or fallback fire-and-forget) drains
 * pending rows into audit_events every minute.
 *
 * This pattern ensures audit events are never lost even if the drain
 * is temporarily unavailable.
 */
export const auditOutbox = pgTable("audit_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Mirrors AuditEvent fields — copied verbatim on drain
  orgId: uuid("org_id").notNull(),
  entityId: uuid("entity_id"),
  actorId: text("actor_id").notNull(),
  actorType: text("actor_type", { enum: ["USER", "SYSTEM"] }).notNull(),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set by drain worker when successfully moved to audit_events
  drainedAt: timestamp("drained_at", { withTimezone: true }),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type AuditOutboxRow = typeof auditOutbox.$inferSelect;
