/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { auditEvents } from "@/infrastructure/db/schema/audit";
import { SyncEngine } from "@/domain/integrations/sync-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  const body = await request.json();
  const syncType = body.syncType || 'INCREMENTAL';

  try {
    await withTenant(orgId, async (tx) => {
      await tx.insert(auditEvents).values({
        orgId,
        userId: request.headers.get("x-user-id") || "system",
        eventType: "CONNECTOR_SYNC_STARTED",
        resourceType: "CONNECTOR_INSTANCE",
        resourceId: params.id,
        details: { syncType }
      });
    });

    await SyncEngine.executeSync(orgId, params.id, syncType);
    
    await withTenant(orgId, async (tx) => {
      await tx.insert(auditEvents).values({
        orgId,
        userId: request.headers.get("x-user-id") || "system",
        eventType: "CONNECTOR_SYNC_COMPLETED",
        resourceType: "CONNECTOR_INSTANCE",
        resourceId: params.id,
        details: { syncType }
      });
    });

    return NextResponse.json({ success: true, message: "Sync completed" });
  } catch (error: any) {
    await withTenant(orgId, async (tx) => {
      await tx.insert(auditEvents).values({
        orgId,
        userId: request.headers.get("x-user-id") || "system",
        eventType: "CONNECTOR_SYNC_FAILED",
        resourceType: "CONNECTOR_INSTANCE",
        resourceId: params.id,
        details: { syncType, error: error.message }
      });
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
