import { describe, it, expect } from 'vitest';
import { Normalizer } from './normalizer';
import { CanonicalTransactionInput } from '../ingestion/types';

describe('Normalizer', () => {
  const normalizer = new Normalizer();

  it('normalizes valid input correctly', () => {
    const input: CanonicalTransactionInput = {
      sourceConnectorId: 'sys-1',
      domainId: 'VAT',
      datasetLabel: 'sales',
      docType: 'invoice' as any,
      docNumber: '123',
      docDate: new Date('2026-06-20'),
      periodKey: '',
      currencyCode: ' eur ',
      exchangeRate: 0,
      netAmount: 100.555,
      taxAmount: 20.111,
      grossAmount: 120.666,
      counterpartyName: 'Test'
    };

    const { transaction, warnings } = normalizer.normalize(input);

    expect(warnings.length).toBeGreaterThan(0);
    expect(transaction.docType).toBe('INVOICE');
    expect(transaction.currencyCode).toBe('EUR');
    expect(transaction.exchangeRate).toBe(1.0);
    expect(transaction.netAmount).toBe(100.56);
    expect(transaction.taxAmount).toBe(20.11);
    expect(transaction.grossAmount).toBe(120.67);
    expect(transaction.baseGrossAmount).toBe(120.67);
    expect(transaction.periodKey).toBe('2026-06');
  });

  it('warns and fallbacks on invalid data', () => {
    const input: CanonicalTransactionInput = {
      sourceConnectorId: 'sys-1',
      domainId: 'VAT',
      datasetLabel: 'sales',
      docType: 'weird_type' as any,
      docNumber: '123',
      docDate: null as any,
      periodKey: '',
      currencyCode: '',
      exchangeRate: 1,
      netAmount: 100,
      taxAmount: 0,
      grossAmount: 100,
      counterpartyName: 'Test'
    };

    const { transaction, warnings } = normalizer.normalize(input);
    
    expect(transaction.docType).toBe('OTHER');
    expect(transaction.currencyCode).toBe('XXX');
    expect(transaction.periodKey).toBe('UNKNOWN');
    expect(warnings.some(w => w.field === 'docType')).toBe(true);
    expect(warnings.some(w => w.field === 'currencyCode')).toBe(true);
    expect(warnings.some(w => w.field === 'periodKey')).toBe(true);
  });
});
