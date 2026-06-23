import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { reconciliationResults } from "@/infrastructure/db/schema/reconciliation";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { and, eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";

  try {
    const body = await request.json();
    const { resultId, targetPlatformId, reason } = body;

    if (!resultId || !reason) {
      return NextResponse.json({ error: "Missing required fields: resultId, reason" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);

      // 1. Fetch current result to verify existence
      const currentResult = await tx.query.reconciliationResults.findFirst({
        where: and(
          eq(reconciliationResults.id, resultId),
          eq(reconciliationResults.orgId, orgId)
        )
      });

      if (!currentResult) {
        throw new Error("Reconciliation result not found");
      }

      const evidenceTrail = currentResult.evidenceTrail as string[] || [];
      evidenceTrail.push(`Manual match applied by ${userId}. Reason: ${reason}`);

      // 2. Update record
      await tx.update(reconciliationResults)
        .set({
          targetPlatformId: targetPlatformId || null,
          matchStatus: "MANUAL_MATCH",
          strategyUsed: "MANUAL",
          resolvedBy: userId,
          evidenceTrail
        })
        .where(eq(reconciliationResults.id, resultId));

      // 3. Emit Audit Event
      await tx.insert(auditOutbox).values({
        orgId,
        actorId: userId,
        actorType: "USER",
        eventType: "RECONCILIATION_MANUAL_MATCH",
        resourceType: "RECONCILIATION_RESULT",
        resourceId: resultId,
        afterState: { targetPlatformId, reason },
        beforeState: { matchStatus: currentResult.matchStatus, targetPlatformId: currentResult.targetPlatformId }
      });
    });

    return NextResponse.json({ status: "SUCCESS" });

  } catch (error) {
    console.error("Manual Match Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
