import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  tier: text("tier", {
    enum: ["STARTER", "PROFESSIONAL", "ENTERPRISE", "PLATFORM"],
  })
    .notNull()
    .default("STARTER"),
  // Array of active module IDs e.g. ["vat", "bank"]
  modules: jsonb("modules").notNull().default([]),
  status: text("status", {
    enum: ["ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED"],
  })
    .notNull()
    .default("TRIAL"),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
