/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { IConnector, ConnectorAuthContext, SyncResult } from './base';
import { ConnectorSyncCursor } from '../types';

export class RestApiConnector implements IConnector {
  
  async authenticate(credentials: Record<string, any>): Promise<ConnectorAuthContext> {
    const authType = credentials.authType;

    if (authType === 'API_KEY') {
      if (!credentials.apiKey) {
        throw new Error("Missing API Key");
      }
      return { apiKey: credentials.apiKey };
    }

    if (authType === 'OAUTH2') {
      if (!credentials.accessToken) {
        throw new Error("Missing OAuth Access Token");
      }
      return { 
        token: credentials.accessToken, 
        refreshToken: credentials.refreshToken 
      };
    }

    throw new Error(`Unsupported authentication type: ${authType}`);
  }

  async testConnection(authContext: ConnectorAuthContext): Promise<boolean> {
    // Mock implementation for MVP
    // A real implementation would make an HTTP GET to a /health or /me endpoint
    if (!authContext.apiKey && !authContext.token) {
      return false;
    }
    return true;
  }

  async fullSync(authContext: ConnectorAuthContext, orgId: string, runId: string): Promise<SyncResult> {
    // Mock implementation for MVP
    // Would fetch all pages and insert them via canonical ingestion pipeline
    console.log(`[RestApiConnector] fullSync for orgId=${orgId}, runId=${runId}`);
    return {
      success: true,
      recordsProcessed: 100,
      newCursor: { last_modified_date: new Date().toISOString() }
    };
  }

  async incrementalSync(authContext: ConnectorAuthContext, cursor: ConnectorSyncCursor, orgId: string, runId: string): Promise<SyncResult> {
    // Mock implementation for MVP
    // Would fetch pages > cursor.last_modified_date
    console.log(`[RestApiConnector] incrementalSync for orgId=${orgId}, runId=${runId}, cursor=${JSON.stringify(cursor)}`);
    return {
      success: true,
      recordsProcessed: 10,
      newCursor: { last_modified_date: new Date().toISOString() }
    };
  }
}

