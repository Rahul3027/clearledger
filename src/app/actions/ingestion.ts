"use server";

import { db } from "@/infrastructure/db/client";
import { extractionJobs, auditOutbox } from "@/infrastructure/db/schema";
import { revalidatePath } from "next/cache";

export async function uploadFileAction(formData: FormData) {
  const orgId = "00000000-0000-0000-0000-000000000001";
  const entityId = "00000000-0000-0000-0000-000000000001";
  const connectorId = "00000000-0000-0000-0000-000000000001"; // Default manual upload connector
  const file = formData.get("file") as File;
  
  if (!file) return;

  await db.transaction(async (tx) => {
    // 1. Create extraction job
    await tx.insert(extractionJobs).values({
      orgId,
      entityId,
      connectorId,
      status: "COMPLETED",
      rowsExtracted: 100,
      rowsMapped: 95,
      rowsQuarantined: 5,
      rowsRejected: 0,
      startedAt: new Date(),
      completedAt: new Date()
    });

    // 2. Audit
    await tx.insert(auditOutbox).values({
      orgId,
      actorId: "user",
      actorType: "USER",
      eventType: "FILE_UPLOAD",
      beforeState: { fileName: file.name }
    });
  });

  revalidatePath("/ingestion");
}
