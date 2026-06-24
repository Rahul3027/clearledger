import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { automationRules } from "@/infrastructure/db/schema/integrations";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  const userId = request.headers.get("x-user-id") || "system";
  const body = await request.json();

  return await withTenant(orgId, async (tx) => {
    const existing = await tx.select().from(automationRules)
      .where(and(eq(automationRules.id, params.id), eq(automationRules.orgId, orgId)));

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [updated] = await tx.update(automationRules)
      .set({
        name: body.name ?? existing[0].name,
        eventType: body.eventType ?? existing[0].eventType,
        conditions: body.conditions ?? existing[0].conditions,
        actionType: body.actionType ?? existing[0].actionType,
        actionPayload: body.actionPayload ?? existing[0].actionPayload,
        isActive: body.isActive ?? existing[0].isActive,
        version: existing[0].version + 1,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(automationRules.id, params.id))
      .returning();

    await tx.insert(auditOutbox).values({
      orgId,
      actorId: userId,
      actorType: userId === "system" ? "SYSTEM" : "USER",
      eventType: "AUTOMATION_RULE_UPDATED",
      resourceType: "AUTOMATION_RULE",
      resourceId: updated.id,
      afterState: { version: updated.version, isActive: updated.isActive }
    });

    return NextResponse.json({ data: updated });
  });
}
