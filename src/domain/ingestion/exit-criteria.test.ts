/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcelCsvAdapter } from './adapters/excel-csv-adapter';
import { PeppolXmlAdapter } from './adapters/peppol-xml-adapter';
import { ConnectorError } from './types';
import { StorageAdapter, FILE_LIMITS } from '../storage/storage-adapter';
import * as xlsx from 'xlsx';
import { ConnectorRegistry } from './registry';

// Mock Storage Adapter
class MockStorageAdapter {
  files: Record<string, Buffer> = {};

  async signedUrl(key: string, ttl: number) {
    return `http://mock-storage.local/${key}`;
  }
}

// Global fetch mock to intercept signed URL downloads
global.fetch = vi.fn(async (url: any) => {
  const urlStr = url.toString();
  const key = urlStr.split('/').pop() as string;
  
  if (urlStr.includes('too-large')) {
    // Return a 6MB buffer
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(6 * 1024 * 1024)
    } as any;
  }
  
  if (urlStr.includes('csv-1000')) {
    // Generate 1000 rows CSV
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      id: `INV-${i}`,
      date: '2026-06-23',
      amount: 100.50,
      currency: 'USD',
      supplier: 'Acme Corp'
    }));
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
    
    return {
      ok: true,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    } as any;
  }
  
  if (urlStr.includes('peppol-xml')) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
      <ID>PEPPOL-123</ID>
      <IssueDate>2026-06-20</IssueDate>
      <DocumentCurrencyCode>EUR</DocumentCurrencyCode>
      <AccountingSupplierParty>
        <Party>
          <PartyName><Name>EuroTech Ltd</Name></PartyName>
          <PartyTaxScheme><CompanyID>NL123456789B01</CompanyID></PartyTaxScheme>
        </Party>
      </AccountingSupplierParty>
      <LegalMonetaryTotal>
        <TaxExclusiveAmount>1000.00</TaxExclusiveAmount>
        <TaxInclusiveAmount>1210.00</TaxInclusiveAmount>
      </LegalMonetaryTotal>
      <TaxTotal>
        <TaxAmount>210.00</TaxAmount>
      </TaxTotal>
    </Invoice>`;
    return {
      ok: true,
      arrayBuffer: async () => Buffer.from(xml).buffer
    } as any;
  }

  return { ok: false, statusText: "Not Found" } as any;
});

describe('Phase 1 Exit Criteria Verification', () => {
  
  let mockStorage: any;
  
  beforeEach(() => {
    mockStorage = new MockStorageAdapter();
  });

  it('1. Upload a sample CSV with 1000 rows through the ingestion pipeline', async () => {
    const adapter = new ExcelCsvAdapter(mockStorage);
    const result = await adapter.extract({
      jobId: 'job-1',
      connectorId: 'excel-csv-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {},
      filePaths: ['csv-1000.csv']
    });
    
    expect(result.rawRecords.length).toBe(1000);
    expect(result.totalParsed).toBe(1000);
    expect(result.rawRecords[0].id).toBe('INV-0');
    expect(result.rawRecords[999].id).toBe('INV-999');
  });

  it('2. Verify canonical transactions are written correctly', async () => {
    const adapter = new ExcelCsvAdapter(mockStorage);
    const extractResult = await adapter.extract({
      jobId: 'job-1',
      connectorId: 'excel-csv-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {},
      filePaths: ['csv-1000.csv']
    });
    
    const transformResult = await adapter.transform(extractResult.rawRecords, {
      jobId: 'job-1',
      connectorId: 'excel-csv-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {
        columnMapping: {
          sourceColumns: {
            docNumber: 'id',
            docDate: 'date',
            grossAmount: 'amount',
            netAmount: 'amount',
            currencyCode: 'currency',
            counterpartyName: 'supplier'
          }
        }
      }
    });
    
    expect(transformResult.canonicalTransactions.length).toBe(1000);
    expect(transformResult.errors.length).toBe(0);
    
    const firstTxn = transformResult.canonicalTransactions[0];
    expect(firstTxn.docNumber).toBe('INV-0');
    expect(firstTxn.grossAmount).toBe(100.50);
    expect(firstTxn.currencyCode).toBe('USD');
    expect(firstTxn.counterpartyName).toBe('Acme Corp');
  });

  it('4. Verify file size limits are enforced', async () => {
    const adapter = new ExcelCsvAdapter(mockStorage);
    await expect(adapter.extract({
      jobId: 'job-2',
      connectorId: 'excel-csv-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {},
      filePaths: ['too-large.csv']
    })).rejects.toThrowError(/exceeds maximum size/i);
  });

  it('5. Verify adapter registry selects the correct adapter by file type (by slug)', () => {
    const registry = ConnectorRegistry.getInstance(mockStorage);
    const excelAdapter = registry.getConnector('excel-csv-v1');
    const xmlAdapter = registry.getConnector('peppol-xml-v1');
    
    expect(excelAdapter).toBeInstanceOf(ExcelCsvAdapter);
    expect(xmlAdapter).toBeInstanceOf(PeppolXmlAdapter);
  });

  it('6. Verify Peppol XML parsing works with a sample document', async () => {
    const adapter = new PeppolXmlAdapter(mockStorage);
    const extractResult = await adapter.extract({
      jobId: 'job-3',
      connectorId: 'peppol-xml-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {},
      filePaths: ['peppol-xml.xml']
    });
    
    expect(extractResult.rawRecords.length).toBe(1);
    
    const transformResult = await adapter.transform(extractResult.rawRecords, {
      jobId: 'job-3',
      connectorId: 'peppol-xml-v1',
      orgId: 'org-1',
      entityId: 'ent-1',
      config: {}
    });
    
    expect(transformResult.canonicalTransactions.length).toBe(1);
    const txn = transformResult.canonicalTransactions[0];
    expect(txn.docNumber).toBe('PEPPOL-123');
    expect(txn.currencyCode).toBe('EUR');
    expect(txn.counterpartyName).toBe('EuroTech Ltd');
    expect(txn.counterpartyTaxId).toBe('NL123456789B01');
    expect(txn.grossAmount).toBe(1210.00);
    expect(txn.netAmount).toBe(1000.00);
    expect(txn.taxAmount).toBe(210.00);
  });
});

