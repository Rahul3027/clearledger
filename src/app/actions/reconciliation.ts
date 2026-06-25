"use server";

import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { reconciliationResults, exceptionCases, exceptionHistory } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createManualMatchAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();
  const sourceTransactionId = formData.get("sourceTransactionId") as string;
  const targetTransactionId = formData.get("targetTransactionId") as string;
  const runId = formData.get("runId") as string;
  const periodKey = formData.get("periodKey") as string;
  const note = formData.get("note") as string;

  await withTenant(orgId, async (tx) => {
    // 1. Create a reconciliation result
    const [result] = await tx.insert(reconciliationResults).values({
      orgId,
      runId,
      periodKey,
      sourcePlatformId: sourceTransactionId,
      targetPlatformId: targetTransactionId,
      matchStatus: "MANUAL_MATCH",
      strategyUsed: "MANUAL",
      confidenceScore: "1.00",
      resolvedBy: user.id,
      evidenceTrail: { note }
    }).returning();

    // 2. Resolve related exception if applicable
    const cases = await tx.select().from(exceptionCases).where(eq(exceptionCases.sourcePlatformId, sourceTransactionId));
    if (cases.length > 0) {
      for (const c of cases) {
        await tx.update(exceptionCases)
          .set({ status: "RESOLVED", resolvedAt: new Date(), reconciliationResultId: result.id })
          .where(eq(exceptionCases.id, c.id));
          
        await tx.insert(exceptionHistory).values({
          orgId,
          caseId: c.id,
          actorId: user.id,
          actionType: "MANUAL_MATCH_RESOLUTION",
          newState: "RESOLVED"
        });
      }
    }
  });

  revalidatePath(`/reconciliation/runs/${runId}`);
}

