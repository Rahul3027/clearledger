/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
export type ConnectorStatus = 'ACTIVE' | 'ERROR' | 'PAUSED';
export type ConnectorHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN';
export type SyncType = 'FULL' | 'INCREMENTAL';
export type SyncRunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type WebhookEventStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type AutomationActionType = 'CREATE_EXCEPTION' | 'SEND_NOTIFICATION' | 'START_SYNC';
export type NotificationChannel = 'EMAIL' | 'IN_APP';

export interface ConnectorSyncCursor {
  last_modified_date?: string;
  last_id?: string;
  [key: string]: any;
}

