import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { getStorageAdapter } from "@/infrastructure/storage/supabase-storage-adapter";
import packageJson from "../../../../package.json";

/**
 * GET /api/health
 *
 * Checks:
 *  1. Database connectivity (SELECT 1)
 *  2. Storage bucket reachability (list bucket root)
 *
 * Returns 200 if all checks pass, 503 if any fail.
 * No authentication required — used by Vercel health checks and monitoring.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let isHealthy = true;

  // ── 1. Database ping ───────────────────────────────────────────────────────
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = "ok";
  } catch {
    checks.db = "error";
    isHealthy = false;
  }

  // ── 2. Storage ping ────────────────────────────────────────────────────────
  try {
    const adapter = getStorageAdapter();
    // Generate a signed URL for a non-existent key — if the bucket is reachable,
    // this throws StorageError; if auth/network is broken, it throws differently.
    // We catch StorageError as "ok" (bucket reached) and re-throw others.
    await adapter.signedUrl("__health_check__", 1).catch((err: Error) => {
      if (err.name === "StorageError") return; // bucket reachable, key just missing
      throw err;
    });
    checks.storage = "ok";
  } catch {
    checks.storage = "error";
    isHealthy = false;
  }

  const body = {
    status: isHealthy ? "ok" : "degraded",
    version: packageJson.version,
    ts: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, { status: isHealthy ? 200 : 503 });
}
