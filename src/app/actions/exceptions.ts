"use server";

import { z } from "zod";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { exceptionCases, exceptionHistory } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const assignSchema = z.object({
  caseId: z.string().uuid(),
  userId: z.string(),
});

export async function assignExceptionAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();

  const parsed = assignSchema.parse({
    caseId: formData.get("caseId"),
    userId: formData.get("userId"),
  });

  await withTenant(orgId, async (tx) => {
    // Verify exception case ownership
    const [exceptionCase] = await tx.select()
      .from(exceptionCases)
      .where(and(eq(exceptionCases.id, parsed.caseId), eq(exceptionCases.orgId, orgId)))
      .limit(1);

    if (!exceptionCase) {
      throw new Error("Exception case not found or unauthorized");
    }

    // 1. Update case
    await tx.update(exceptionCases)
      .set({ 
        assignedTo: parsed.userId,
        status: "IN_REVIEW",
        assignedAt: new Date()
      })
      .where(eq(exceptionCases.id, parsed.caseId));

    // 2. Record history
    await tx.insert(exceptionHistory).values({
      orgId,
      caseId: parsed.caseId,
      actorId: user.id,
      actionType: "ASSIGNMENT",
      newState: "IN_REVIEW"
    });
  });

  revalidatePath("/exceptions");
}

export async function resolveExceptionAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();
  const caseId = formData.get("caseId") as string;

  await withTenant(orgId, async (tx) => {
    // Verify exception case ownership
    const [exceptionCase] = await tx.select()
      .from(exceptionCases)
      .where(and(eq(exceptionCases.id, caseId), eq(exceptionCases.orgId, orgId)))
      .limit(1);

    if (!exceptionCase) {
      throw new Error("Exception case not found or unauthorized");
    }

    await tx.update(exceptionCases)
      .set({ 
        status: "RESOLVED",
        resolvedAt: new Date()
      })
      .where(eq(exceptionCases.id, caseId));

    await tx.insert(exceptionHistory).values({
      orgId,
      caseId,
      actorId: user.id,
      actionType: "STATUS_CHANGE",
      newState: "RESOLVED"
    });
  });

  revalidatePath("/exceptions");
  revalidatePath(`/exceptions/${caseId}`);
}

