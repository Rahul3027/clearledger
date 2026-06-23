import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases, exceptionHistory } from "@/infrastructure/db/schema/workflow";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { eq } from "drizzle-orm";
import { SLATracker } from "@/domain/workflow/sla-tracker";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { ExceptionCase } from "@/domain/workflow/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { assigneeId } = await request.json();

    return await withTenant(orgId, async (tx) => {
      const [currentCase] = await tx.select().from(exceptionCases).where(eq(exceptionCases.id, params.id));
      if (!currentCase) throw new Error("Not Found");

      // Domain Logic: SLAs
      const updates = SLATracker.handleAssignment(currentCase as unknown as ExceptionCase, assigneeId);
      
      const isReassignment = currentCase.assignedTo && currentCase.assignedTo !== assigneeId;
      const eventType = isReassignment ? "CASE_REASSIGNED" : "CASE_ASSIGNED";

      // 1. Update Case
      await tx.update(exceptionCases).set(updates).where(eq(exceptionCases.id, params.id));

      // 2. Write Local Immutable History
      await tx.insert(exceptionHistory).values({
        orgId,
        caseId: params.id,
        actorId,
        actionType: eventType,
        previousState: currentCase.assignedTo,
        newState: assigneeId
      });

      // 3. Global Audit Emit
      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, eventType, params.id, 
        { assignedTo: currentCase.assignedTo }, 
        { assignedTo: assigneeId }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({ status: "SUCCESS" });
    });
  } catch (error) {
    console.error("Assignment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
