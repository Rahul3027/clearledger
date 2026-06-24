import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { sql } from "drizzle-orm";

/**
 * Database client — infrastructure layer only.
 * Domain logic never imports from this file.
 *
 * Uses DATABASE_URL (pooled via Supabase pgBouncer in transaction mode).
 * Migrations use DATABASE_URL_DIRECT (direct connection, not pooled).
 *
 * Lazy-initialized to prevent crashes during `next build` page data collection
 * when DATABASE_URL is not present in the build environment.
 */

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  // Transaction-mode pooler: no prepared statements
  const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 5, // Low ceiling — Vercel serverless functions each open short-lived connections
  });
  _db = drizzle(client, { schema });
  return _db;
}

// Keep a named export for compatibility but it is lazily evaluated
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop as string | symbol];
  },
});

export type Db = ReturnType<typeof getDb>;

export async function withTenant<T>(
  orgId: string, 
  callback: (tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]) => Promise<T>
): Promise<T> {
  return await getDb().transaction(async (tx) => {
    // Set the tenant context securely for this transaction block
    await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
    return await callback(tx);
  });
}
