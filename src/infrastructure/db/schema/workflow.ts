import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { canonicalTransactions } from "./ingestion";
import { reconciliationResults } from "./reconciliation";

export const exceptionCases = pgTable("exception_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  
  // Link to the offending transaction
  sourcePlatformId: uuid("source_platform_id").notNull().references(() => canonicalTransactions.platformId, { onDelete: "cascade" }),
  // Optional link if it originated from a reconciliation failure
  reconciliationResultId: uuid("reconciliation_result_id").references(() => reconciliationResults.id, { onDelete: "set null" }),
  
  status: text("status", { 
    enum: ["OPEN", "IN_REVIEW", "WAITING_FOR_INFO", "RESOLVED", "CLOSED", "REOPENED"] 
  }).notNull().default("OPEN"),
  
  priority: text("priority", { 
    enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] 
  }).notNull().default("MEDIUM"),
  
  assignedTo: text("assigned_to"), // Nullable initially
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  slaTargetAt: timestamp("sla_target_at", { withTimezone: true }), // For breach tracking
});

export const exceptionComments = pgTable("exception_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => exceptionCases.id, { onDelete: "cascade" }),
  
  authorId: text("author_id").notNull(),
  contentText: text("content_text").notNull(),
  commentType: text("comment_type", { enum: ["INTERNAL", "RESOLUTION"] }).notNull().default("INTERNAL"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exceptionAttachments = pgTable("exception_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => exceptionCases.id, { onDelete: "cascade" }),
  
  uploaderId: text("uploader_id").notNull(),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exceptionHistory = pgTable("exception_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").notNull().references(() => exceptionCases.id, { onDelete: "cascade" }),
  
  actorId: text("actor_id").notNull(),
  actionType: text("action_type").notNull(), // e.g., STATUS_CHANGE, ASSIGNMENT, PRIORITY_CHANGE
  previousState: text("previous_state"),
  newState: text("new_state"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
