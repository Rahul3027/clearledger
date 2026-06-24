import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { connectorInstances } from "@/infrastructure/db/schema/integrations";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { CredentialManager } from "@/domain/integrations/credential-manager";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  const body = await request.json();
  
  return await withTenant(orgId, async (tx) => {
    
    const existing = await tx.select().from(connectorInstances)
      .where(and(eq(connectorInstances.id, params.id), eq(connectorInstances.orgId, orgId)));
      
    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let { encryptedCredentials } = existing[0];
    
    if (body.credentials) {
      if (encryptedCredentials) {
        encryptedCredentials = CredentialManager.rotate(encryptedCredentials, body.credentials);
      } else {
        encryptedCredentials = CredentialManager.encrypt(body.credentials);
      }
    }

    const [updated] = await tx.update(connectorInstances)
      .set({
        configuration: body.configuration || existing[0].configuration,
        encryptedCredentials,
        status: body.status || existing[0].status,
        updatedAt: new Date()
      })
      .where(eq(connectorInstances.id, params.id))
      .returning();

    const actId = request.headers.get("x-user-id") || "system";
    await tx.insert(auditOutbox).values({
      orgId,
      actorId: actId,
      actorType: actId === "system" ? "SYSTEM" : "USER",
      eventType: "CONNECTOR_UPDATED",
      resourceType: "CONNECTOR_INSTANCE",
      resourceId: updated.id,
      afterState: { status: updated.status }
    });

    return NextResponse.json({ data: updated });
  });
}
