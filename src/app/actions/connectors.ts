"use server";

import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { connectors, extractionJobs, auditOutbox } from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function triggerSyncAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();
  const connectorId = formData.get("connectorId") as string;

  await withTenant(orgId, async (tx) => {
    // Retrieve the connector to verify tenancy and get entityId
    const [connector] = await tx.select()
      .from(connectors)
      .where(and(eq(connectors.id, connectorId), eq(connectors.orgId, orgId)))
      .limit(1);
      
    if (!connector) {
      throw new Error("Connector not found or unauthorized");
    }
    
    const entityId = connector.entityId;

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

    await tx.insert(auditOutbox).values({
      orgId,
      actorId: user.id,
      actorType: "USER",
      eventType: "MANUAL_SYNC_TRIGGERED",
      beforeState: { connectorId }
    });
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${connectorId}`);
}

export async function disableConnectorAction(formData: FormData) {
  const { user, orgId } = await getAuthenticatedTenant();
  const connectorId = formData.get("connectorId") as string;

  await withTenant(orgId, async (tx) => {
    // Verify connector ownership
    const [connector] = await tx.select()
      .from(connectors)
      .where(and(eq(connectors.id, connectorId), eq(connectors.orgId, orgId)))
      .limit(1);

    if (!connector) {
      throw new Error("Connector not found or unauthorized");
    }

    await tx.update(connectors)
      .set({ status: "SUSPENDED" })
      .where(eq(connectors.id, connectorId));

    await tx.insert(auditOutbox).values({
      orgId,
      actorId: user.id,
      actorType: "USER",
      eventType: "CONNECTOR_DISABLED",
      beforeState: { connectorId }
    });
  });

  revalidatePath("/connectors");
  revalidatePath(`/connectors/${connectorId}`);
}

