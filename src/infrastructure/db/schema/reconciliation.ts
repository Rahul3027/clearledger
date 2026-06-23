import { pgTable, text, timestamp, uuid, integer, numeric, jsonb, unique } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { canonicalTransactions } from "./ingestion";

export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  periodKey: text("period_key").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED", "FAILED"] }).notNull().default("IN_PROGRESS"),
  recordsProcessed: integer("records_processed").default(0),
  initiatedBy: text("initiated_by").notNull(),
});

export const reconciliationResults = pgTable("reconciliation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  runId: uuid("run_id").notNull().references(() => reconciliationRuns.id, { onDelete: "cascade" }),
  periodKey: text("period_key").notNull(),
  
  sourcePlatformId: uuid("source_platform_id").notNull().references(() => canonicalTransactions.platformId, { onDelete: "cascade" }),
  targetPlatformId: uuid("target_platform_id").references(() => canonicalTransactions.platformId, { onDelete: "cascade" }), // Nullable for UNMATCHED
  
  matchStatus: text("match_status", { 
    enum: ["MATCHED", "MATCHED_WITH_TOLERANCE", "AMBIGUOUS", "UNMATCHED", "MANUAL_MATCH"] 
  }).notNull(),
  
  strategyUsed: text("strategy_used"), // EXACT, TOLERANCE, COMPOSITE, MANUAL
  confidenceScore: numeric("confidence_score"),
  amountVariance: numeric("amount_variance"),
  evidenceTrail: jsonb("evidence_trail"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedBy: text("resolved_by"), // for manual overrides
}, (table) => {
  return {
    // Enforce 1-to-1 locking per period at the DB layer
    // A source tx can only have one result per period
    sourceUnique: unique("reconciliation_source_idx").on(table.periodKey, table.sourcePlatformId),
    // A target tx can only be matched to one source per period
    targetUnique: unique("reconciliation_target_idx").on(table.periodKey, table.targetPlatformId)
  };
});
