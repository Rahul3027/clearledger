import { describe, it, expect } from 'vitest';
import { ReconciliationEngine } from './engine';
import { DEFAULT_RECONCILIATION_CONFIG } from './config';
import { CanonicalTransactionInput } from '../ingestion/types';

describe('Reconciliation Engine', () => {
  const engine = new ReconciliationEngine(DEFAULT_RECONCILIATION_CONFIG);

  const baseTx: CanonicalTransactionInput = {
    platformId: 'source-1',
    sourceConnectorId: 'sys1',
    domainId: 'VAT',
    datasetLabel: 'erp',
    docType: 'INVOICE',
    docNumber: 'INV-123',
    docDate: new Date('2026-06-20'),
    periodKey: '2026-06',
    currencyCode: 'USD',
    exchangeRate: 1.0,
    netAmount: 100.0,
    taxAmount: 20.0,
    grossAmount: 120.0,
    counterpartyTaxId: 'TAX123'
  };

  it('1. Matches exact identical records with 100 confidence', () => {
    const targetTx = { ...baseTx, platformId: 'target-1', datasetLabel: 'portal' };
    const results = engine.runReconciliation([baseTx], [targetTx]);

    expect(results.length).toBe(1);
    expect(results[0].status).toBe('MATCHED');
    expect(results[0].confidenceScore).toBe(100);
    expect(results[0].strategyUsed).toBe('EXACT');
  });

  it('2. Enforces 1-to-1 lock: second source misses out on claimed target', () => {
    const targetTx = { ...baseTx, platformId: 'target-1' };
    const sourceTx2 = { ...baseTx, platformId: 'source-2' };
    
    // Both sources are identical. The first one in array claims the target.
    const results = engine.runReconciliation([baseTx, sourceTx2], [targetTx]);

    expect(results.length).toBe(2);
    expect(results[0].status).toBe('MATCHED');
    expect(results[0].targetTx?.platformId).toBe('target-1');
    
    expect(results[1].status).toBe('UNMATCHED');
    expect(results[1].targetTx).toBeUndefined();
  });

  it('3. Applies penalties correctly for tolerance matches', () => {
    const targetTx = { 
      ...baseTx, 
      platformId: 'target-1',
      netAmount: 100.04 // 0.04 variance. Max tolerance is 0.05.
    };
    
    const results = engine.runReconciliation([baseTx], [targetTx]);

    expect(results[0].status).toBe('MATCHED_WITH_TOLERANCE');
    // Base is 90. 
    // amountVariance = 0.04. maxAmountTolerance = 0.05.
    // Penalty = (0.04 / 0.05) * 5 = 4 points.
    // Score = 90 - 4 = 86.
    expect(results[0].confidenceScore).toBeCloseTo(86.0);
    expect(results[0].evidenceTrail.join(' ')).toContain('-4.00 penalty');
  });

  it('4. Detects AMBIGUOUS status when multiple targets tie for top score', () => {
    const target1 = { ...baseTx, platformId: 'target-1' };
    const target2 = { ...baseTx, platformId: 'target-2' };
    // Both target1 and target2 are exact matches. They tie with score 100.
    
    const results = engine.runReconciliation([baseTx], [target1, target2]);

    expect(results[0].status).toBe('AMBIGUOUS');
    expect(results[0].confidenceScore).toBe(100);
    expect(results[0].evidenceTrail.join(' ')).toContain('target-1, target-2');
  });

  it('5. Selects highest confidence candidate without ambiguity', () => {
    const targetPerfect = { ...baseTx, platformId: 'target-perfect' };
    const targetTolerable = { ...baseTx, platformId: 'target-tol', netAmount: 100.04 };
    
    // It should pick targetPerfect (score 100) over targetTolerable (score 86)
    const results = engine.runReconciliation([baseTx], [targetTolerable, targetPerfect]);

    expect(results[0].status).toBe('MATCHED');
    expect(results[0].targetTx?.platformId).toBe('target-perfect');
    expect(results[0].confidenceScore).toBe(100);
  });
});
