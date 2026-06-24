import { NextResponse } from "next/server";
import { db, withTenant } from "@/infrastructure/db/client";
import { reconciliationRuns } from "@/infrastructure/db/schema/reconciliation";
import { desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await withTenant(orgId, async (tx) => {
      
      const records = await tx.select()
        .from(reconciliationRuns)
        .orderBy(desc(reconciliationRuns.startedAt))
        .limit(50);
        
      return NextResponse.json({ data: records });
    });
  } catch (error) {
    console.error("Fetch Runs Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
