import { NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases, exceptionComments, exceptionAttachments, exceptionHistory } from "@/infrastructure/db/schema/workflow";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return await withTenant(orgId, async (tx) => {
      const [caseData] = await tx.select().from(exceptionCases).where(eq(exceptionCases.id, params.id));
      if (!caseData) return NextResponse.json({ error: "Not Found" }, { status: 404 });

      // Fetch Thread
      const comments = await tx.select().from(exceptionComments).where(eq(exceptionComments.caseId, params.id));
      const attachments = await tx.select().from(exceptionAttachments).where(eq(exceptionAttachments.caseId, params.id));
      const history = await tx.select().from(exceptionHistory).where(eq(exceptionHistory.caseId, params.id));

      return NextResponse.json({ 
        data: {
          ...caseData,
          thread: { comments, attachments, history }
        }
      });
    });
  } catch (error) {
    console.error("Fetch Case Detail Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
