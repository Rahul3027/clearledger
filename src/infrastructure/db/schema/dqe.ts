import { pgTable, uuid, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { canonicalTransactions } from "./ingestion";

export const dqResults = pgTable("dq_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  platformId: uuid("platform_id").notNull().references(() => canonicalTransactions.platformId, { onDelete: "cascade" }),
  
  score: numeric("score").notNull(),
  action: text("action", {
    enum: ["ADMITTED", "ADMITTED_WITH_WARNING", "QUARANTINED", "REJECTED"]
  }).notNull(),
  
  rulesEvaluated: jsonb("rules_evaluated").notNull(),
  engineVersion: text("engine_version").notNull(),
  
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dqReviews = pgTable("dq_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  platformId: uuid("platform_id").notNull().references(() => canonicalTransactions.platformId, { onDelete: "cascade" }),
  
  action: text("action").notNull(), // e.g., 'FORCE_ADMIT', 'FORCE_REJECT'
  reviewerId: text("reviewer_id").notNull(), // text to support UUID or synthetic ID during auth
  reason: text("reason").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DqResultDB = typeof dqResults.$inferSelect;
export type NewDqResultDB = typeof dqResults.$inferInsert;

export type DqReviewDB = typeof dqReviews.$inferSelect;
export type NewDqReviewDB = typeof dqReviews.$inferInsert;
