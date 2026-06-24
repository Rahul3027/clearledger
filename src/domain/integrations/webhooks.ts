/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import crypto from 'crypto';
import { db, withTenant } from '@/infrastructure/db/client';
import { webhookEvents } from '@/infrastructure/db/schema/integrations';
import { auditOutbox } from '@/infrastructure/db/schema/audit';
import { eq, and } from 'drizzle-orm';

export class WebhookManager {
  
  /**
   * Validates HMAC signature of the payload to protect against spoofing
   */
  static validateSignature(payloadString: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);
    
    if (sigBuffer.length !== expectedSigBuffer.length) {
      return false;
    }
    
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);
  }

  /**
   * Processes an incoming webhook idempotently
   */
  static async processIncoming(
    orgId: string, 
    provider: string, 
    externalEventId: string, 
    payload: any, 
    payloadString: string, 
    signature: string, 
    secret: string
  ): Promise<string> {
    
    // 1. Signature validation
    if (!this.validateSignature(payloadString, signature, secret)) {
      throw new Error("Invalid webhook signature");
    }

    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    return await withTenant(orgId, async (tx) => {
      // 2. Idempotency & Replay protection check
      const existing = await tx.select().from(webhookEvents).where(
        and(
          eq(webhookEvents.provider, provider),
          eq(webhookEvents.externalEventId, externalEventId)
        )
      );

      if (existing.length > 0) {
        console.log(`[WebhookManager] Event ${externalEventId} from ${provider} already processed. Ignoring replay.`);
        return existing[0].id;
      }

      // 3. Persist Event
      const [newEvent] = await tx.insert(webhookEvents).values({
        orgId,
        provider,
        externalEventId,
        payloadHash,
        payload,
        status: 'PROCESSED',
        processedAt: new Date()
      }).returning();

      // In a real system, we'd trigger an Inngest/Trigger.dev job here 
      // For MVP, we synchronously mark it processed and log the event.
      await tx.insert(auditOutbox).values({
        orgId,
        actorId: 'system',
        actorType: 'SYSTEM',
        eventType: 'WEBHOOK_PROCESSED',
        resourceType: 'WEBHOOK_EVENT',
        resourceId: newEvent.id,
        afterState: { provider, externalEventId }
      });



      return newEvent.id;
    });
  }
}

