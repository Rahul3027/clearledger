import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { reconciliationRuns } from "@/infrastructure/db/schema/reconciliation";
import { desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
      
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
