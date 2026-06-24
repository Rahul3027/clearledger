import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { notificationEvents } from "@/infrastructure/db/schema/integrations";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  return await withTenant(orgId, async (tx) => {
    const notifications = await tx.select().from(notificationEvents)
      .where(eq(notificationEvents.orgId, orgId))
      .orderBy(desc(notificationEvents.createdAt))
      .limit(50);
    return NextResponse.json({ data: notifications });
  });
}
