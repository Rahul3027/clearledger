import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { entities } from "./entities";

export const entityMemberships = pgTable("entity_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"],
  }).notNull(),
  grantedBy: uuid("granted_by").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // null = active membership
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type EntityMembership = typeof entityMemberships.$inferSelect;
export type NewEntityMembership = typeof entityMemberships.$inferInsert;
