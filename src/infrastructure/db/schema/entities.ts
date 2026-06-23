import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(),
  countryCode: text("country_code").notNull(),
  taxRegNo: text("tax_reg_no"),
  // Day-of-month fiscal year starts (1–12)
  fiscalYearStart: integer("fiscal_year_start").notNull().default(1),
  timezone: text("timezone").notNull().default("UTC"),
  dataRegion: text("data_region").notNull().default("us-east-1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
