import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client — infrastructure layer only.
 * Domain logic never imports from this file.
 *
 * Uses DATABASE_URL (pooled via Supabase pgBouncer in transaction mode).
 * Migrations use DATABASE_URL_DIRECT (direct connection, not pooled).
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Transaction-mode pooler: no prepared statements
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 5, // Low ceiling — Vercel serverless functions each open short-lived connections
});

export const db = drizzle(client, { schema });

export type Db = typeof db;
