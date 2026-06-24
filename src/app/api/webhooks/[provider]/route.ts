/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextRequest, NextResponse } from "next/server";
import { WebhookManager } from "@/domain/integrations/webhooks";
import { withTenant, db } from "@/infrastructure/db/client";
import { auditEvents } from "@/infrastructure/db/schema/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  // Note: Public webhooks usually don't have x-org-id injected by middleware
  // In a real system, tenant is inferred from the path, query param, or payload.
  // For MVP, we require the provider to pass x-org-id or a dedicated webhook tenant key.
  const orgId = request.headers.get("x-org-id");
  if (!orgId) return NextResponse.json({ error: "Missing webhook tenant context" }, { status: 401 });

  const signature = request.headers.get("x-webhook-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 401 });

  const payloadString = await request.text();
  const payload = JSON.parse(payloadString);
  const externalEventId = payload.id || request.headers.get("x-webhook-id");

  if (!externalEventId) {
    return NextResponse.json({ error: "Missing external event ID for idempotency" }, { status: 400 });
  }

  try {
    // Secret would normally be looked up per provider/tenant
    const dummySecret = process.env.WEBHOOK_SECRET || "mvp-secret-key";
    
    const eventId = await WebhookManager.processIncoming(
      orgId, 
      params.provider, 
      externalEventId, 
      payload, 
      payloadString, 
      signature, 
      dummySecret
    );

    await withTenant(orgId, async (tx) => {
      await tx.insert(auditEvents).values({
        orgId,
        userId: "system",
        eventType: "WEBHOOK_RECEIVED",
        resourceType: "WEBHOOK_EVENT",
        resourceId: eventId,
        details: { provider: params.provider, externalEventId }
      });
    });

    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
