"use server";

import { db } from "@/infrastructure/db/client";
import { connectors, extractionJobs, auditEvents } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function triggerSyncAction(formData: FormData) {
  const orgId = "00000000-0000-0000-0000-000000000001";
  const entityId = "00000000-0000-0000-0000-000000000001";
  const connectorId = formData.get("connectorId") as string;

  await db.transaction(async (tx) => {
    await tx.insert(extractionJobs).values({
      orgId,
      entityId,
      connectorId,
      status: "RUNNING",
      rowsExtracted: 0,
      rowsMapped: 0,
      rowsQuarantined: 0,
      rowsRejected: 0,
      startedAt: new Date()
    });

    await tx.insert(auditEvents).values({
      orgId,
      actorId: "system",
      action: "MANUAL_SYNC_TRIGGERED",
      event: `Manual sync triggered for connector ${connectorId}`
    });
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${connectorId}`);
}

export async function disableConnectorAction(formData: FormData) {
  const orgId = "00000000-0000-0000-0000-000000000001";
  const connectorId = formData.get("connectorId") as string;

  await db.transaction(async (tx) => {
    await tx.update(connectors)
      .set({ status: "SUSPENDED" })
      .where(eq(connectors.id, connectorId));

    await tx.insert(auditEvents).values({
      orgId,
      actorId: "system",
      action: "CONNECTOR_DISABLED",
      event: `Connector ${connectorId} suspended`
    });
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${connectorId}`);
}
