import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { syncRuns } from "@/infrastructure/db/schema/integrations";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  return await withTenant(orgId, async (tx) => {
    const runs = await tx.select().from(syncRuns)
      .where(eq(syncRuns.orgId, orgId))
      .orderBy(desc(syncRuns.startedAt))
      .limit(50);
    return NextResponse.json({ data: runs });
  });
}
