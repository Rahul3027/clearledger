import { NextResponse } from "next/server";
import { db, withTenant } from "@/infrastructure/db/client";
import { dqReviews } from "@/infrastructure/db/schema/dqe";
import { auditOutbox } from "@/infrastructure/db/schema/audit";

export async function POST(request: Request) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Assuming middleware passed the authenticated user ID as well
  // For V1 MVP without full RBAC in the route, we'll accept it via header or payload
  // In a real app we'd fetch this from the session or JWT
  const reviewerId = request.headers.get("x-user-id") || "SYSTEM_ADMIN"; 

  try {
    const body = await request.json();
    const { platformId, action, reason } = body;

    if (!platformId || !action || !reason) {
      return NextResponse.json({ error: "Missing required fields: platformId, action, reason" }, { status: 400 });
    }

    if (!["FORCE_ADMIT", "FORCE_REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    await withTenant(orgId, async (tx) => {

      // 1. Insert review record (do NOT update canonical_transactions.dq_action)
      const [reviewRecord] = await tx.insert(dqReviews).values({
        orgId,
        platformId,
        action,
        reviewerId,
        reason
      }).returning();

      // 2. Generate immutable Audit Event
      await tx.insert(auditOutbox).values({
        orgId,
        actorId: reviewerId,
        actorType: "USER",
        eventType: "OVERRIDE",
        resourceType: "CANONICAL_TRANSACTION",
        resourceId: platformId,
        afterState: { action, reason, reviewId: reviewRecord.id },
      });
    });

    return NextResponse.json({ status: "SUCCESS" });
  } catch (error) {
    console.error("DQE Review API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
