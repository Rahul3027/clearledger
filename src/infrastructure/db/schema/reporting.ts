import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const evidencePackages = pgTable("evidence_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  
  periodKey: text("period_key").notNull(),
  
  status: text("status", { 
    enum: ["PENDING", "GENERATING", "READY", "FAILED", "EXPIRED"] 
  }).notNull().default("PENDING"),
  
  storagePath: text("storage_path"),
  requestedBy: text("requested_by").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
