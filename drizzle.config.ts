import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL_DIRECT) {
  throw new Error("DATABASE_URL_DIRECT must be set for migrations");
}

export default {
  schema: "./src/infrastructure/db/schema/index.ts",
  out: "./src/infrastructure/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Direct connection (not pooled) — required for DDL and migrations
    url: process.env.DATABASE_URL_DIRECT,
  },
  // Keep generated SQL readable
  breakpoints: true,
  verbose: true,
  strict: true,
} satisfies Config;
