import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Optional date filters
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  try {
    return await withTenant(orgId, async (tx) => {
      
      let query = tx.select().from(auditOutbox).where(eq(auditOutbox.orgId, orgId));
      
      if (startDate) {
        query = query.where(sql`${auditOutbox.createdAt} >= ${new Date(startDate).toISOString()}`);
      }
      if (endDate) {
        query = query.where(sql`${auditOutbox.createdAt} <= ${new Date(endDate).toISOString()}`);
      }
      
      // Limit to 5000 in V1 to prevent payload crashes on standard JSON exports
      const activities = await query.orderBy(desc(auditOutbox.createdAt)).limit(5000);

      // Audit the Audit query
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "REPORT_GENERATED" as any, "audit-activity", 
        undefined, { startDate, endDate }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({ data: activities });
    });
  } catch (error) {
    console.error("Audit Activity Export Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
