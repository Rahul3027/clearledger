/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { db, withTenant } from '@/infrastructure/db/client';
import { automationRules } from '@/infrastructure/db/schema/integrations';
import { auditEvents } from '@/infrastructure/db/schema/audit';
import { exceptionCases } from '@/infrastructure/db/schema/workflow';
import { eq, and } from 'drizzle-orm';
import { NotificationManager } from './notifications';
import { SyncEngine } from './sync-engine';

export class AutomationEngine {
  
  /**
   * Processes a system event and triggers any matching active automation rules.
   */
  static async triggerEvent(orgId: string, eventType: string, eventPayload: Record<string, any>) {
    await withTenant(orgId, async (tx) => {
      // 1. Fetch active rules for this event type
      const rules = await tx.select().from(automationRules).where(
        and(
          eq(automationRules.orgId, orgId),
          eq(automationRules.eventType, eventType),
          eq(automationRules.isActive, true)
        )
      );

      for (const rule of rules) {
        // 2. Evaluate Condition (Simplified MVP: if conditions match event payload keys/values)
        if (this.evaluateConditions(rule.conditions as any, eventPayload)) {
          // 3. Execute Action
          await this.executeAction(orgId, rule, eventPayload, tx);
        }
      }
    });
  }

  private static evaluateConditions(conditions: Record<string, any> | null, payload: Record<string, any>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true; // No condition = always run
    
    // MVP: simple key-value equality match
    for (const [key, expectedValue] of Object.entries(conditions)) {
      if (payload[key] !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  private static async executeAction(orgId: string, rule: any, eventPayload: any, tx: any) {
    const actionPayload = rule.actionPayload as any;

    try {
      switch (rule.actionType) {
        case 'CREATE_EXCEPTION':
          await tx.insert(exceptionCases).values({
            orgId,
            title: actionPayload.title || `Automated Exception: ${rule.name}`,
            description: actionPayload.description || `Triggered by event ${rule.eventType}`,
            status: 'OPEN',
            priority: actionPayload.priority || 'MEDIUM',
            domainId: eventPayload.domainId || 'SYSTEM',
            assigneeId: actionPayload.assigneeId
          });
          break;

        case 'SEND_NOTIFICATION':
          await NotificationManager.dispatch(
            orgId,
            actionPayload.channel || 'EMAIL',
            actionPayload.recipient,
            {
              subject: actionPayload.subject || `Alert: ${rule.name}`,
              body: actionPayload.body || JSON.stringify(eventPayload),
            },
            `${rule.id}-${eventPayload.id}` // Dedupe key using rule + event id
          );
          break;

        case 'START_SYNC':
          // In a real system, we'd queue this to prevent blocking the tx.
          // For MVP, we will synchronously trigger the engine.
          await SyncEngine.executeSync(orgId, actionPayload.connectorInstanceId, 'INCREMENTAL');
          break;

        default:
          console.warn(`[AutomationEngine] Unknown action type: ${rule.actionType}`);
      }

      await tx.insert(auditEvents).values({
        orgId,
        userId: 'system',
        eventType: 'AUTOMATION_RULE_EXECUTED',
        resourceType: 'AUTOMATION_RULE',
        resourceId: rule.id,
        details: { actionType: rule.actionType, eventType: rule.eventType }
      });
      
    } catch (error) {
      console.error(`[AutomationEngine] Failed to execute rule ${rule.id}:`, error);
      // We don't throw here to ensure one failing rule doesn't block other rules from executing
    }
  }
}

