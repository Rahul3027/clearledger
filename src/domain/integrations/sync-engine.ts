/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { db, withTenant } from '@/infrastructure/db/client';
import { connectorInstances, syncRuns } from '@/infrastructure/db/schema/integrations';
import { eq, and, isNull } from 'drizzle-orm';
import { CredentialManager } from './credential-manager';
import { RestApiConnector } from './connectors/rest';
import { SyncType } from './types';
import { randomUUID } from 'crypto';

export class SyncEngine {

  /**
   * Executes a sync run with pessimistic locking to prevent concurrent syncs for the same connector instance.
   */
  static async executeSync(orgId: string, instanceId: string, syncType: SyncType): Promise<void> {
    await withTenant(orgId, async (tx) => {
      // 1. Attempt to acquire a lock on the connector instance
      const workerId = randomUUID();
      
      const updateResult = await tx.update(connectorInstances)
        .set({ 
          lockedAt: new Date(), 
          lockedBy: workerId,
          status: 'ACTIVE'
        })
        .where(
          and(
            eq(connectorInstances.id, instanceId),
            eq(connectorInstances.orgId, orgId),
            isNull(connectorInstances.lockedAt) // Only lock if currently unlocked
          )
        )
        .returning();

      if (updateResult.length === 0) {
        throw new Error(`ConnectorInstance ${instanceId} is already locked or does not exist.`);
      }

      const instance = updateResult[0];

      // 2. Create the sync_run record
      const [run] = await tx.insert(syncRuns).values({
        orgId,
        connectorInstanceId: instanceId,
        syncType,
        status: 'IN_PROGRESS',
      }).returning();

      try {
        // 3. Decrypt credentials and authenticate
        if (!instance.encryptedCredentials) {
          throw new Error('No credentials configured for this connector');
        }
        
        const credentials = CredentialManager.decrypt(instance.encryptedCredentials);
        
        // Factory pattern mock: we hardcode RestApiConnector for MVP
        const connector = new RestApiConnector();
        const authContext = await connector.authenticate(credentials);

        // 4. Execute sync
        let syncResult;
        if (syncType === 'FULL' || !instance.syncCursor) {
          syncResult = await connector.fullSync(authContext, orgId, run.id);
        } else {
          syncResult = await connector.incrementalSync(authContext, instance.syncCursor as any, orgId, run.id);
        }

        if (!syncResult.success) {
          throw new Error(syncResult.error || 'Sync failed within connector');
        }

        // 5. Update success state and new cursor
        await tx.update(syncRuns)
          .set({
            status: 'COMPLETED',
            completedAt: new Date(),
            recordsProcessed: syncResult.recordsProcessed
          })
          .where(eq(syncRuns.id, run.id));

        await tx.update(connectorInstances)
          .set({
            syncCursor: syncResult.newCursor,
            lastSyncAt: new Date(),
            failureCount: 0,
            lockedAt: null,
            lockedBy: null
          })
          .where(eq(connectorInstances.id, instanceId));

      } catch (error: any) {
        // 6. Handle failure recovery and unlock
        await tx.update(syncRuns)
          .set({
            status: 'FAILED',
            completedAt: new Date(),
          })
          .where(eq(syncRuns.id, run.id));

        await tx.update(connectorInstances)
          .set({
            status: instance.failureCount + 1 >= 3 ? 'ERROR' : 'ACTIVE',
            healthStatus: instance.failureCount + 1 >= 3 ? 'DOWN' : 'DEGRADED',
            failureCount: instance.failureCount + 1,
            lockedAt: null,
            lockedBy: null
          })
          .where(eq(connectorInstances.id, instanceId));

        throw error;
      }
    });
  }
}

