/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as RunPOST } from '../../app/api/reconciliation/run/route';
import { POST as ManualPOST } from '../../app/api/reconciliation/manual-match/route';

vi.mock('@/infrastructure/db/client', () => {
  
  return {
    db: {
      transaction: vi.fn(async (cb) => {
        const tx = {
          execute: vi.fn(),
          query: {
            canonicalTransactions: {
              findMany: vi.fn().mockResolvedValue([
                {
                  platformId: 'source-1',
                  docNumber: 'INV-123',
                  currencyCode: 'USD',
                  netAmount: 100,
                  taxAmount: 20,
                  grossAmount: 120,
                  counterpartyTaxId: 'TAX1',
                  docDate: '2026-06-20',
                  dqAction: 'ADMITTED'
                }
              ])
            },
            reconciliationResults: {
              findFirst: vi.fn().mockResolvedValue({
                id: 'res-1',
                orgId: 'org-1',
                matchStatus: 'AMBIGUOUS',
                evidenceTrail: []
              })
            }
          },
          insert: vi.fn().mockImplementation((schema) => {
            return {
              values: (data: unknown) => {
                (global as unknown as { mockDbInserts: unknown[] }).mockDbInserts.push({ schema, data });
                const returnData = Array.isArray(data) ? data.map(d => ({ ...d, id: 'mock-id' })) : [{ ...data, id: 'mock-id' }];
                return {
                  onConflictDoUpdate: vi.fn().mockResolvedValue(returnData),
                  returning: vi.fn().mockResolvedValue(returnData)
                };
              }
            };
          }),
          update: vi.fn().mockReturnValue({
            set: (data: unknown) => {
              (global as unknown as { mockDbUpdates: unknown[] }).mockDbUpdates.push(data);
              return {
                where: vi.fn().mockResolvedValue([])
              };
            }
          })
        };
        return cb(tx);
      })
    }
  };
});

describe('Phase 3 Integration & API Verification', () => {
  beforeEach(() => {
    (global as unknown as { mockDbInserts: unknown[] }).mockDbInserts = [];
    (global as unknown as { mockDbUpdates: unknown[] }).mockDbUpdates = [];
    vi.clearAllMocks();
  });

  it('1. /api/reconciliation/run emits STARTED and COMPLETED audit events', async () => {
    const req = new Request('http://localhost/api/reconciliation/run', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ periodKey: '2026-06', sourceDomainId: 'VAT', targetDomainId: 'GOV' })
    });

    const res = await RunPOST(req);
    expect(res.status).toBe(200);

    const inserts = (global as unknown as { mockDbInserts: Array<{ schema: { [key: symbol]: string }, data: Record<string, unknown> }> }).mockDbInserts;
    const auditInserts = inserts.filter((i) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    
    // Should have STARTED and COMPLETED
    expect(auditInserts.length).toBe(2);
    expect(auditInserts[0].data.eventType).toBe('RECONCILIATION_RUN_STARTED');
    expect(auditInserts[1].data.eventType).toBe('RECONCILIATION_RUN_COMPLETED');
  });

  it('2. /api/reconciliation/run stores exactly 1 result per source record (1-to-1 enforcement)', async () => {
    const req = new Request('http://localhost/api/reconciliation/run', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ periodKey: '2026-06', sourceDomainId: 'VAT', targetDomainId: 'GOV' })
    });

    await RunPOST(req);
    const inserts = (global as unknown as { mockDbInserts: Array<{ schema: { [key: symbol]: string }, data: any[] }> }).mockDbInserts;
    
    const resultsInsert = inserts.find((i) => i.schema[Symbol.for('drizzle:Name')] === 'reconciliation_results');
    
    expect(resultsInsert).toBeDefined();
    // Since we mocked DB to return 1 source and 1 target with identical properties, they should EXACT match.
    expect(resultsInsert.data[0].matchStatus).toBe('MATCHED');
    expect(resultsInsert.data[0].strategyUsed).toBe('EXACT');
    expect(resultsInsert.data[0].targetPlatformId).toBe('source-1'); // Because both source and target queries returned the same mock object
  });

  it('3. /api/reconciliation/manual-match overrides AMBIGUOUS state and emits audit event', async () => {
    const req = new Request('http://localhost/api/reconciliation/manual-match', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1', 'x-user-id': 'user-123' },
      body: JSON.stringify({ resultId: 'res-1', targetPlatformId: 'target-99', reason: 'Verified via email' })
    });

    const res = await ManualPOST(req);
    expect(res.status).toBe(200);

    const updates = (global as unknown as { mockDbUpdates: Record<string, unknown>[] }).mockDbUpdates;
    const inserts = (global as unknown as { mockDbInserts: Array<{ schema: { [key: symbol]: string }, data: Record<string, unknown> }> }).mockDbInserts;

    // Check that we set status to MANUAL_MATCH
    expect(updates.length).toBe(1);
    expect(updates[0].matchStatus).toBe('MANUAL_MATCH');
    expect(updates[0].targetPlatformId).toBe('target-99');
    expect(updates[0].resolvedBy).toBe('user-123');

    // Check that an audit event was emitted
    const auditInsert = inserts.find((i) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert).toBeDefined();
    expect(auditInsert.data.eventType).toBe('RECONCILIATION_MANUAL_MATCH');
  });
});

