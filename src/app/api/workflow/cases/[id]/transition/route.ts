import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases, exceptionHistory, exceptionComments } from "@/infrastructure/db/schema/workflow";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { eq } from "drizzle-orm";
import { SLATracker } from "@/domain/workflow/sla-tracker";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";
import { WorkflowStateMachine } from "@/domain/workflow/state-machine";
import { CaseStatus, ExceptionCase } from "@/domain/workflow/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { nextState, resolutionNotes } = await request.json();

    return await withTenant(orgId, async (tx) => {
      const [currentCase] = await tx.select().from(exceptionCases).where(eq(exceptionCases.id, params.id));
      if (!currentCase) throw new Error("Not Found");

      // 1. Validate State Machine
      WorkflowStateMachine.validateTransition(currentCase.status as CaseStatus, nextState as CaseStatus);
      
      if (WorkflowStateMachine.requiresResolutionNotes(nextState as CaseStatus) && !resolutionNotes) {
        throw new Error("Resolution Notes are mandatory for this transition.");
      }

      // 2. Domain Logic: SLAs
      const updates = SLATracker.handleTransition(currentCase as unknown as ExceptionCase, nextState as CaseStatus);
      
      // 3. Update Case
      await tx.update(exceptionCases).set(updates).where(eq(exceptionCases.id, params.id));

      // 4. Append Resolution Notes if present
      if (resolutionNotes) {
        await tx.insert(exceptionComments).values({
          orgId,
          caseId: params.id,
          authorId: actorId,
          contentText: resolutionNotes,
          commentType: "RESOLUTION"
        });
      }

      // 5. Write Local Immutable History
      await tx.insert(exceptionHistory).values({
        orgId,
        caseId: params.id,
        actorId,
        actionType: "STATUS_CHANGE",
        previousState: currentCase.status,
        newState: nextState
      });

      // 6. Global Audit Emit
      let auditEventType: any = "CASE_STATUS_CHANGED";
      if (nextState === "RESOLVED") auditEventType = "CASE_RESOLVED";
      if (nextState === "CLOSED") auditEventType = "CASE_CLOSED";
      if (nextState === "REOPENED") auditEventType = "CASE_REOPENED"; // V1 updated

      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, auditEventType, params.id, 
        { status: currentCase.status }, 
        { status: nextState }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({ status: "SUCCESS" });
    });
  } catch (error: any) {
    console.error("Transition Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 });
  }
}
