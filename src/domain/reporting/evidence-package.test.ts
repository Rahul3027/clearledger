import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as GeneratePOST } from '../../app/api/reports/evidence-package/generate/route';
import { GET as DownloadGET } from '../../app/api/reports/evidence-package/download/route';
import { GET as MetricsGET } from '../../app/api/reports/dashboard-metrics/route';

// Track audit outbox inserts
const mockAuditOutbox: Record<string, unknown>[] = [];
// Track appended files for structure verification
const mockAppendedFiles: string[] = [];

vi.mock('@react-pdf/renderer', () => ({
  renderToStream: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-buffer')),
  StyleSheet: { create: vi.fn((s) => s) },
  Document: vi.fn(({ children }) => children),
  Page: vi.fn(({ children }) => children),
  Text: vi.fn(({ children }) => children),
  View: vi.fn(({ children }) => children),
}));

// We explicitly DO NOT mock archiver to allow real generation

vi.mock('@/infrastructure/storage/supabase-storage-adapter', () => ({
  getStorageAdapter: vi.fn().mockReturnValue({
    uploadFile: vi.fn().mockResolvedValue(true)
  })
}));

const mockReconResults = Array.from({ length: 1000 }, (_, i) => ({ id: `recon-${i}`, confidence: 100 }));
const mockExceptions = Array.from({ length: 500 }, (_, i) => ({ id: `case-${i}`, status: 'RESOLVED' }));
const mockAttachments = Array.from({ length: 50 }, (_, i) => ({ id: `att-${i}`, fileName: `file-${i}.pdf` }));

vi.mock('@/infrastructure/db/client', () => {
  return {
    withTenant: vi.fn(async (orgId, cb) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockImplementation((schema) => {
            const name = schema[Symbol.for('drizzle:Name') as keyof typeof schema];
            let data: unknown[] = [];
            if (name === 'reconciliation_results') data = mockReconResults;
            if (name === 'canonical_transactions') data = mockReconResults; 
            if (name === 'exception_cases') data = mockExceptions;
            if (name === 'exception_attachments') data = mockAttachments;
            if (name === 'evidence_packages') data = [{ id: 'mock-pkg-id', orgId: 'org-1', status: 'READY', storagePath: 'test/path.zip' }];
            if (name === 'audit_outbox') data = [];

            const mockQuery = {
              where: vi.fn().mockResolvedValue(data),
              leftJoin: vi.fn().mockReturnThis()
            };
            return mockQuery;
          })
        }),
        insert: vi.fn().mockImplementation((schema) => {
          return {
            values: vi.fn().mockImplementation((values) => {
              if (schema[Symbol.for('drizzle:Name')] === 'audit_outbox') {
                mockAuditOutbox.push(values);
              }
              return {
                returning: vi.fn().mockResolvedValue([{ id: 'mock-pkg-id' }])
              };
            })
          };
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'mock-pkg-id', status: 'READY' }])
            })
          })
        })
      };
      return cb(tx);
    })
  };
});

describe('Phase 5 Evidence Package & Audit Verification', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditOutbox.length = 0;
    mockAppendedFiles.length = 0;
  });

  it('1. Generates High-Volume Evidence Package without Memory Exhaustion or Timeout', async () => {
    const startTime = performance.now();

    const req = new Request('http://localhost/api/reports/evidence-package/generate', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ periodKey: '2023-12' })
    });

    const res = await GeneratePOST(req);
    const durationMs = performance.now() - startTime;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('READY');
    expect(durationMs).toBeLessThan(10000); 
  }, 15000);

  it('2. Audit event REPORT_GENERATED is explicitly emitted', async () => {
    const req = new Request('http://localhost/api/reports/dashboard-metrics?periodKey=2023-12', {
      method: 'GET',
      headers: { 'x-org-id': 'org-1' }
    });
    
    await MetricsGET(req);
    const hasEvent = mockAuditOutbox.some(e => e.eventType === 'REPORT_GENERATED');
    expect(hasEvent).toBe(true);
  });

  it('3. Audit event EVIDENCE_PACKAGE_REQUESTED is explicitly emitted', async () => {
    const req = new Request('http://localhost/api/reports/evidence-package/generate', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ periodKey: '2023-12' })
    });
    
    await GeneratePOST(req);
    const hasEvent = mockAuditOutbox.some(e => e.eventType === 'EVIDENCE_PACKAGE_REQUESTED');
    expect(hasEvent).toBe(true);
  }, 15000);

  it('4. Audit event EVIDENCE_PACKAGE_DOWNLOADED is explicitly emitted', async () => {
    const req = new Request('http://localhost/api/reports/evidence-package/download?packageId=mock-pkg-id', {
      method: 'GET',
      headers: { 'x-org-id': 'org-1' }
    });
    
    await DownloadGET(req);
    const hasEvent = mockAuditOutbox.some(e => e.eventType === 'EVIDENCE_PACKAGE_DOWNLOADED');
    expect(hasEvent).toBe(true);
  });

});
