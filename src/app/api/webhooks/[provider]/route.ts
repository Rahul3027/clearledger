/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { NextRequest, NextResponse } from "next/server";
import { WebhookManager } from "@/domain/integrations/webhooks";
import { withTenant, db } from "@/infrastructure/db/client";
import { connectors } from "@/infrastructure/db/schema/ingestion";
import { auditOutbox } from "@/infrastructure/db/schema/audit";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  // 1. Fail closed if WEBHOOK_SECRET is missing
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] WEBHOOK_SECRET is missing in environment.");
    return NextResponse.json({ error: "Webhook service is unconfigured" }, { status: 500 });
  }

  // 2. Validate webhook signature first
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const payloadString = await request.text();
  let payload: any;
  try {
    payload = JSON.parse(payloadString);
  } catch (parseError) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const isValid = WebhookManager.validateSignature(payloadString, signature, secret);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const externalEventId = payload.id || request.headers.get("x-webhook-id");
  if (!externalEventId) {
    return NextResponse.json({ error: "Missing external event ID for idempotency" }, { status: 400 });
  }

  try {
    // 3. Resolve Connector and Tenant from configuration (do NOT trust x-org-id header)
    const matchedConnectors = await db.select()
      .from(connectors)
      .where(eq(connectors.slug, params.provider))
      .limit(1);

    if (matchedConnectors.length === 0) {
      return NextResponse.json({ error: "No connector configured for this provider" }, { status: 404 });
    }

    const dbConnector = matchedConnectors[0];
    const orgId = dbConnector.orgId;

    // 4. Process event under the resolved tenant context
    const eventId = await WebhookManager.processIncoming(
      orgId, 
      params.provider, 
      externalEventId, 
      payload, 
      payloadString, 
      signature, 
      secret
    );

    await withTenant(orgId, async (tx) => {
      await tx.insert(auditOutbox).values({
        orgId,
        actorId: "system",
        actorType: "SYSTEM",
        eventType: "WEBHOOK_RECEIVED",
        resourceType: "WEBHOOK_EVENT",
        resourceId: eventId,
        afterState: { provider: params.provider, externalEventId }
      });
    });

    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
