/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextRequest, NextResponse } from "next/server";
import { withTenant, db } from "@/infrastructure/db/client";
import { connectorInstances, connectorDefinitions } from "@/infrastructure/db/schema/integrations";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { CredentialManager } from "@/domain/integrations/credential-manager";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  return await withTenant(orgId, async (tx) => {
    const instances = await tx.select().from(connectorInstances)
      .where(eq(connectorInstances.orgId, orgId));
    return NextResponse.json({ data: instances });
  });
}

export async function POST(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  const body = await request.json();
  const { connectorDefinitionId, configuration, credentials } = body;

  if (!connectorDefinitionId) {
    return NextResponse.json({ error: "Missing connectorDefinitionId" }, { status: 400 });
  }

  return await withTenant(orgId, async (tx) => {
    
    let encryptedCredentials = null;
    if (credentials) {
      encryptedCredentials = CredentialManager.encrypt(credentials);
    }

    const [instance] = await tx.insert(connectorInstances).values({
      orgId,
      connectorDefinitionId,
      configuration,
      encryptedCredentials,
      status: 'ACTIVE'
    }).returning();

    const actId = request.headers.get("x-user-id") || "system";
    await tx.insert(auditOutbox).values({
      orgId,
      actorId: actId,
      actorType: actId === "system" ? "SYSTEM" : "USER",
      eventType: "CONNECTOR_CREATED",
      resourceType: "CONNECTOR_INSTANCE",
      resourceId: instance.id,
      afterState: { definitionId: connectorDefinitionId }
    });

    return NextResponse.json({ data: instance }, { status: 201 });
  });
}
