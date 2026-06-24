/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { db, withTenant } from '@/infrastructure/db/client';
import { notificationEvents } from '@/infrastructure/db/schema/integrations';
import { auditOutbox } from '@/infrastructure/db/schema/audit';
import { eq } from 'drizzle-orm';
import { NotificationChannel } from './types';

export interface NotificationPayload {
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

export class NotificationManager {
  
  /**
   * Dispatches a notification to the specified channel.
   * Includes deduplication support to prevent spamming users for identical consecutive alerts.
   */
  static async dispatch(
    orgId: string,
    channel: NotificationChannel,
    recipient: string,
    payload: NotificationPayload,
    dedupeKey?: string
  ): Promise<string | null> {
    
    return await withTenant(orgId, async (tx) => {
      
      // Deduplication check
      if (dedupeKey) {
        const existing = await tx.select().from(notificationEvents)
          .where(eq(notificationEvents.dedupeKey, dedupeKey));
          
        if (existing.length > 0) {
          console.log(`[NotificationManager] Suppressing duplicate notification for key: ${dedupeKey}`);
          return existing[0].id; // Silently return existing ID
        }
      }

      // Record the notification event
      const [event] = await tx.insert(notificationEvents).values({
        orgId,
        channel,
        recipient,
        payload,
        dedupeKey,
        status: 'PENDING'
      }).returning();

      try {
        if (channel === 'EMAIL') {
          await this.sendEmail(recipient, payload);
        } else if (channel === 'IN_APP') {
          await this.sendInApp(recipient, payload);
        }
        
        // Mark as sent
        await tx.update(notificationEvents)
          .set({ status: 'SENT', sentAt: new Date() })
          .where(eq(notificationEvents.id, event.id));
          
        await tx.insert(auditOutbox).values({
          orgId,
          actorId: 'system',
          actorType: 'SYSTEM',
          eventType: 'NOTIFICATION_SENT',
          resourceType: 'NOTIFICATION_EVENT',
          resourceId: event.id,
          afterState: { channel, recipient }
        });
          
      } catch (error) {
        // Mark as failed
        await tx.update(notificationEvents)
          .set({ status: 'FAILED' })
          .where(eq(notificationEvents.id, event.id));
        throw error;
      }

      return event.id;
    });
  }

  private static async sendEmail(to: string, payload: NotificationPayload) {
    // Stub for Resend / SendGrid provider integration
    console.log(`[Email] Sending to ${to}: ${payload.subject}`);
  }

  private static async sendInApp(userId: string, payload: NotificationPayload) {
    // Stub for in-app DB/socket notification delivery
    console.log(`[InApp] Delivery to user ${userId}: ${payload.subject}`);
  }
}

