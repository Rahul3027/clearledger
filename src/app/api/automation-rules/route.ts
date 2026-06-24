import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/infrastructure/db/client";
import { automationRules } from "@/infrastructure/db/schema/integrations";
import { auditEvents } from "@/infrastructure/db/schema/audit";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  return await withTenant(orgId, async (tx) => {
    const rules = await tx.select().from(automationRules).where(eq(automationRules.orgId, orgId));
    return NextResponse.json({ data: rules });
  });
}

export async function POST(request: NextRequest) {
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing tenant context" }, { status: 401 });

  const userId = request.headers.get("x-user-id") || "system";
  const body = await request.json();

  return await withTenant(orgId, async (tx) => {
    const [rule] = await tx.insert(automationRules).values({
      orgId,
      name: body.name,
      eventType: body.eventType,
      conditions: body.conditions,
      actionType: body.actionType,
      actionPayload: body.actionPayload,
      isActive: body.isActive ?? true,
      createdBy: userId,
      updatedBy: userId
    }).returning();

    await tx.insert(auditEvents).values({
      orgId,
      userId,
      eventType: "AUTOMATION_RULE_CREATED",
      resourceType: "AUTOMATION_RULE",
      resourceId: rule.id,
      details: { name: rule.name, actionType: rule.actionType }
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  });
}
