/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { exceptionCases, exceptionHistory } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const assignSchema = z.object({
  caseId: z.string().uuid(),
  userId: z.string(),
});

export async function assignExceptionAction(formData: FormData) {
  // In a real app, we'd get the orgId and userId from the auth session
  const orgId = "00000000-0000-0000-0000-000000000001";
  const actorId = "system";

  const parsed = assignSchema.parse({
    caseId: formData.get("caseId"),
    userId: formData.get("userId"),
  });

  await db.transaction(async (tx) => {
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
      actorId,
      actionType: "ASSIGNMENT",
      newState: "IN_REVIEW"
    });
  });

  revalidatePath("/exceptions");
}

export async function resolveExceptionAction(formData: FormData) {
  const orgId = "00000000-0000-0000-0000-000000000001";
  const caseId = formData.get("caseId") as string;
  const resolutionNote = formData.get("resolutionNote") as string;

  await db.transaction(async (tx) => {
    await tx.update(exceptionCases)
      .set({ 
        status: "RESOLVED",
        resolvedAt: new Date()
      })
      .where(eq(exceptionCases.id, caseId));

    await tx.insert(exceptionHistory).values({
      orgId,
      caseId,
      actorId: "system",
      actionType: "STATUS_CHANGE",
      newState: "RESOLVED"
    });
  });

  revalidatePath("/exceptions");
  revalidatePath(`/exceptions/${caseId}`);
}
