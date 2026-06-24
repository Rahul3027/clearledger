/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as TransitionPOST } from '../../app/api/workflow/cases/[id]/transition/route';
import { POST as AssignPOST } from '../../app/api/workflow/cases/[id]/assign/route';
import { POST as CommentPOST } from '../../app/api/workflow/cases/[id]/comments/route';
import { POST as AttachmentPOST } from '../../app/api/workflow/cases/[id]/attachments/route';

vi.mock('@/infrastructure/storage/supabase-storage-adapter', () => ({
  getStorageAdapter: vi.fn().mockReturnValue({
    uploadFile: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('@/infrastructure/db/client', () => {
  return {
    withTenant: vi.fn(async (orgId, cb) => {
      const tx = {
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([ (global as any).mockDbCaseState ])
          })
        }),
        insert: vi.fn().mockImplementation((schema) => {
          return {
            values: (data: any) => {
              (global as any).mockDbInserts.push({ schema, data });
              const returnData = Array.isArray(data) ? data.map(d => ({ ...d, id: 'mock-id' })) : [{ ...data, id: 'mock-id' }];
              return { returning: vi.fn().mockResolvedValue(returnData) };
            }
          };
        }),
        update: vi.fn().mockReturnValue({
          set: (data: any) => {
            (global as any).mockDbUpdates.push(data);
            return {
              where: vi.fn().mockResolvedValue([])
            };
          }
        })
      };
      return cb(tx);
    })
  };
});

describe('Phase 4 Workflow Comprehensive Integration Verification', () => {
  beforeEach(() => {
    (global as any).mockDbInserts = [];
    (global as any).mockDbUpdates = [];
    (global as any).mockDbCaseState = {
      id: 'case-1',
      status: 'OPEN',
      assignedTo: null,
      firstResponseAt: null
    };
    vi.clearAllMocks();
  });

  it('1. State machine rejects forbidden transitions', async () => {
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'RESOLVED', resolutionNotes: 'Fixed it' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(400);
  });

  it('2. OPEN -> IN_REVIEW allowed & CASE_STATUS_CHANGED emitted', async () => {
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'IN_REVIEW' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(200);

    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_STATUS_CHANGED');
  });

  it('3. IN_REVIEW -> RESOLVED allowed & CASE_RESOLVED emitted', async () => {
    (global as any).mockDbCaseState.status = 'IN_REVIEW';
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'RESOLVED', resolutionNotes: 'Resolved' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(200);

    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_RESOLVED');
  });

  it('4. RESOLVED -> CLOSED allowed & CASE_CLOSED emitted', async () => {
    (global as any).mockDbCaseState.status = 'RESOLVED';
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'CLOSED', resolutionNotes: 'Closing' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(200);

    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_CLOSED');
  });

  it('5. CLOSED -> REOPENED succeeds & CASE_REOPENED emitted', async () => {
    (global as any).mockDbCaseState.status = 'CLOSED';
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'REOPENED' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(200);
    
    const updates = (global as any).mockDbUpdates;
    expect(updates[0].status).toBe('REOPENED');

    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_REOPENED');
  });

  it('6. REOPENED -> IN_REVIEW succeeds', async () => {
    (global as any).mockDbCaseState.status = 'REOPENED';
    const req = new Request('http://localhost/api/workflow/cases/case-1/transition', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ nextState: 'IN_REVIEW' })
    });
    const res = await TransitionPOST(req, { params: { id: 'case-1' } });
    expect(res.status).toBe(200);
    
    const updates = (global as any).mockDbUpdates;
    expect(updates[0].status).toBe('IN_REVIEW');
  });

  it('7. First Assignment emits CASE_ASSIGNED', async () => {
    const req = new Request('http://localhost/api/workflow/cases/case-1/assign', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ assigneeId: 'user-1' })
    });
    await AssignPOST(req, { params: { id: 'case-1' } });
    
    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_ASSIGNED');
  });

  it('8. Reassignment emits CASE_REASSIGNED', async () => {
    (global as any).mockDbCaseState.assignedTo = 'user-1';
    const req = new Request('http://localhost/api/workflow/cases/case-1/assign', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ assigneeId: 'user-2' })
    });
    await AssignPOST(req, { params: { id: 'case-1' } });
    
    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_REASSIGNED');
  });

  it('9. Add Comment emits CASE_COMMENT_ADDED', async () => {
    const req = new Request('http://localhost/api/workflow/cases/case-1/comments', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: JSON.stringify({ contentText: 'Hello' })
    });
    await CommentPOST(req, { params: { id: 'case-1' } });
    
    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_COMMENT_ADDED');
  });

  it('10. Add Attachment emits CASE_ATTACHMENT_ADDED', async () => {
    const formData = new FormData();
    formData.append('file', new File(['content'], 'test.pdf', { type: 'application/pdf' }));

    const req = new Request('http://localhost/api/workflow/cases/case-1/attachments', {
      method: 'POST',
      headers: { 'x-org-id': 'org-1' },
      body: formData
    });
    await AttachmentPOST(req, { params: { id: 'case-1' } });
    
    const inserts = (global as any).mockDbInserts;
    const auditInsert = inserts.find((i: any) => i.schema[Symbol.for('drizzle:Name')] === 'audit_outbox');
    expect(auditInsert.data.eventType).toBe('CASE_ATTACHMENT_ADDED');
  });
});
