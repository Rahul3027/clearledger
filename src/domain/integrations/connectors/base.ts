/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { ConnectorSyncCursor } from '../types';

export interface ConnectorAuthContext {
  token?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  newCursor?: ConnectorSyncCursor;
  error?: string;
}

export interface IConnector {
  /**
   * Authenticate and return the context needed for requests
   */
  authenticate(credentials: Record<string, any>): Promise<ConnectorAuthContext>;
  
  /**
   * Test if the connection and credentials are valid
   */
  testConnection(authContext: ConnectorAuthContext): Promise<boolean>;

  /**
   * Perform a full historical sync. 
   * WARNING: Connectors must ONLY write to the Ingestion pipeline.
   * They must NEVER write directly to DQE, Workflow, Reconciliation, or Reporting tables.
   */
  fullSync(authContext: ConnectorAuthContext, orgId: string, runId: string): Promise<SyncResult>;

  /**
   * Perform an incremental sync using a cursor.
   * WARNING: Connectors must ONLY write to the Ingestion pipeline.
   */
  incrementalSync(authContext: ConnectorAuthContext, cursor: ConnectorSyncCursor, orgId: string, runId: string): Promise<SyncResult>;
}

