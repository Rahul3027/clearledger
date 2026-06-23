import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionComments } from "@/infrastructure/db/schema/workflow";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { AuditEncoder } from "@/domain/workflow/audit-encoder";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const orgId = request.headers.get("x-org-id");
  const actorId = request.headers.get("x-user-id") || "SYSTEM_ADMIN";
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { contentText } = await request.json();

    if (!contentText) {
      return NextResponse.json({ error: "Content text is required" }, { status: 400 });
    }

    return await withTenant(orgId, async (tx) => {
      
      const [comment] = await tx.insert(exceptionComments).values({
        orgId,
        caseId: params.id,
        authorId: actorId,
        contentText,
        commentType: "INTERNAL"
      }).returning();

      const outboxEvent = AuditEncoder.encodeEvent(
        orgId, actorId, "CASE_COMMENT_ADDED", params.id, 
        undefined, 
        { commentId: comment.id }
      );
      await tx.insert(auditOutbox).values(outboxEvent);

      return NextResponse.json({ status: "SUCCESS", data: comment });
    });
  } catch (error: any) {
    console.error("Add Comment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
