import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

// NOTE: email and display_name are stored encrypted at the application layer
// before being written here. The DB columns hold ciphertext.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  // Supabase Auth user ID — links to auth.users
  authUserId: uuid("auth_user_id").notNull().unique(),
  // PII: stored encrypted (AES-256 via app layer before insert)
  emailEnc: text("email_enc").notNull(),
  displayNameEnc: text("display_name_enc").notNull(),
  globalRole: text("global_role", {
    enum: ["ORG_ADMIN", "ORG_VIEWER"],
  })
    .notNull()
    .default("ORG_VIEWER"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Erasure: set to true after right-to-erasure; email/name hashed in place
  isAnonymised: boolean("is_anonymised").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
