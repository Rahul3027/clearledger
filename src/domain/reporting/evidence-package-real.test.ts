import { describe, it, expect, vi } from 'vitest';
import { EvidencePackager } from './evidence-packager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

// We explicitly DO NOT mock archiver or @react-pdf/renderer.
// We want the real PDF buffers and the real ZIP buffers.

// Mock the DB client to simulate MASSIVE array returns.
const mockReconResults = Array.from({ length: 10 }, (_, i) => ({ id: `recon-${i}`, confidence: 100 }));
const mockExceptions = Array.from({ length: 10 }, (_, i) => ({ id: `case-${i}`, status: 'RESOLVED' }));
const mockHistory = Array.from({ length: 10 }, (_, i) => ({ id: `hist-${i}`, action: 'RESOLVED' }));
const mockAttachments = Array.from({ length: 2 }, (_, i) => ({ 
  id: `att-${i}`, 
  fileName: `file-${i}.pdf`, 
  storagePath: `checksum-${i}`, 
  uploaderId: `user-${i}`, 
  createdAt: '2023-12-01T00:00:00Z', 
  caseId: `case-${i}` 
}));

vi.mock('@/infrastructure/storage/supabase-storage-adapter', () => ({
  getStorageAdapter: vi.fn().mockReturnValue({
    uploadFile: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('@/infrastructure/db/client', () => {
  return {
    withTenant: vi.fn(async (orgId, cb) => cb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((schema) => {
          const name = schema[Symbol.for('drizzle:Name') as keyof typeof schema];
          let data: unknown[] = [];
          if (name === 'reconciliation_results') data = mockReconResults;
          if (name === 'canonical_transactions') data = mockReconResults; 
          if (name === 'exception_cases') data = mockExceptions;
          if (name === 'exception_history') data = mockHistory;
          if (name === 'exception_attachments') data = mockAttachments;
          if (name === 'audit_outbox') data = [];

          return { where: vi.fn().mockResolvedValue(data) };
        })
      })
    }))
  };
});

describe('Phase 5 REAL Execution Evidence Verification', () => {
  
  it('1. Generates Real PDF and Real ZIP to FileSystem without mocking archiver', async () => {
    const tmpFile = path.join(os.tmpdir(), `evidence-package-${Date.now()}.zip`);
    const writableStream = fs.createWriteStream(tmpFile);
    
    // We mock the tx object manually just for this call
    const tx = {
      select: () => ({
        from: (schema: { [key: symbol]: string }) => {
          const name = schema[Symbol.for('drizzle:Name') as keyof typeof schema];
          let data: unknown[] = [];
          if (name === 'reconciliation_results') data = mockReconResults;
          if (name === 'canonical_transactions') data = mockReconResults; 
          if (name === 'exception_cases') data = mockExceptions;
          if (name === 'exception_history') data = mockHistory;
          if (name === 'exception_attachments') data = mockAttachments;
          if (name === 'audit_outbox') data = [];
          return { where: () => Promise.resolve(data) };
        }
      })
    };

    // This will run the real React PDF renderer and real archiver natively to the file stream
    await EvidencePackager.generatePackage(tx, 'org-1', '2023-12', 'pkg-1', writableStream);

    // Assert the file exists on disk and has size
    const stat = fs.statSync(tmpFile);
    expect(stat.size).toBeGreaterThan(0);
    console.log(`\n[PDF & ZIP VERIFICATION] ZIP generated natively to ${tmpFile}. Size: ${stat.size} bytes`);

    // Verify ZIP Contents using adm-zip
    const zip = new AdmZip(tmpFile);
    const zipEntries = zip.getEntries();
    
    const fileNames = zipEntries.map(e => e.entryName);
    console.log(`[ZIP VERIFICATION] Extracted entries: \n  - ${fileNames.join('\n  - ')}\n`);

    // Core requirements
    expect(fileNames).toContain('summary_report.pdf');
    expect(fileNames).toContain('dataset/canonical_transactions.csv');
    expect(fileNames).toContain('dataset/reconciliation_results.csv');
    expect(fileNames).toContain('workflow/exception_cases.csv');
    expect(fileNames).toContain('workflow/exception_history.csv');
    expect(fileNames).toContain('evidence_attachments/manifest.json');
    expect(fileNames).toContain('compliance/audit_ledger.json');

    // PDF specific validation
    const pdfEntry = zipEntries.find(e => e.entryName === 'summary_report.pdf');
    const pdfBuffer = pdfEntry!.getData();
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Valid PDF headers begin with %PDF-
    const pdfHeader = pdfBuffer.subarray(0, 5).toString('utf-8');
    expect(pdfHeader).toBe('%PDF-');
    console.log(`[PDF VERIFICATION] PDF Buffer Header Validated: ${pdfHeader} | Size: ${pdfBuffer.length} bytes`);

    // Attachment & Manifest Inclusion Verification
    expect(fileNames).toContain('evidence_attachments/file-0.pdf');
    const manifestEntry = zipEntries.find(e => e.entryName === 'evidence_attachments/manifest.json');
    const manifestJson = JSON.parse(manifestEntry!.getData().toString('utf-8'));
    
    expect(manifestJson.length).toBe(2);
    expect(manifestJson[0].original_filename).toBe('file-0.pdf');
    console.log(`[ATTACHMENT VERIFICATION] Manifest successfully parsed. Entry 0 filename: ${manifestJson[0].original_filename}`);

    // Cleanup
    fs.unlinkSync(tmpFile);
  }, 10000); // 10s timeout since react-pdf takes a second to boot fonts
});
