/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { describe, it, expect, vi } from 'vitest';
import { RestApiConnector } from './connectors/rest';
import { CredentialManager } from './credential-manager';

describe('Phase 6 Connector Framework', () => {
  
  it('1. Verifies REST auth and credential management', async () => {
    const rawCreds = { authType: 'API_KEY', apiKey: 'sk_test_123' };
    const encrypted = CredentialManager.encrypt(rawCreds);
    expect(Buffer.from(encrypted, 'base64').toString('utf8')).toContain(':'); // IV:SALT:TAG:DATA structure

    const decrypted = CredentialManager.decrypt(encrypted);
    expect(decrypted.apiKey).toBe('sk_test_123');

    const connector = new RestApiConnector();
    const authContext = await connector.authenticate(decrypted);
    expect(authContext.apiKey).toBe('sk_test_123');
  });

  it('2. Verifies incremental sync execution handling cursors', async () => {
    const connector = new RestApiConnector();
    const result = await connector.incrementalSync(
      { apiKey: 'sk_test_123' }, 
      { last_modified_date: '2026-01-01T00:00:00Z' }, 
      'org-1', 
      'run-1'
    );
    expect(result.success).toBe(true);
    expect(result.newCursor).toBeDefined();
    expect(result.recordsProcessed).toBe(10);
  });
});

