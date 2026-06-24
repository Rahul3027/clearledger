/* eslint-disable no-restricted-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getReconRuns } from '@/app/api/reconciliation/runs/route';
import { GET as getWorkflowCases } from '@/app/api/workflow/cases/route';
import { POST as runRecon } from '@/app/api/reconciliation/run/route';
import * as dbClient from '@/infrastructure/db/client';

vi.mock('@/infrastructure/db/client', () => {
  return {
    withTenant: vi.fn(),
    db: {
      transaction: vi.fn()
    }
  };
});

describe('Phase 5.5B Tenant Isolation Remediation', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dbClient.withTenant as any).mockImplementation(async (orgId: string) => {
      // Simulate successful execution of the inner transaction block
      return { orgId_in_tx: orgId, success: true };
    });
  });

  it('1. Workflow Isolation: Passes exact tenant context to withTenant', async () => {
    const req = new NextRequest('http://localhost/api/workflow/cases', {
      headers: new Headers({ 'x-org-id': 'org-1' })
    });
    await getWorkflowCases(req);
    expect(dbClient.withTenant).toHaveBeenCalledWith('org-1', expect.any(Function));
  });

  it('2. Reconciliation Read Isolation: Passes exact tenant context to withTenant', async () => {
    const req = new NextRequest('http://localhost/api/reconciliation/runs', {
      headers: new Headers({ 'x-org-id': 'org-2' })
    });
    await getReconRuns(req);
    expect(dbClient.withTenant).toHaveBeenCalledWith('org-2', expect.any(Function));
  });

  it('3. Reconciliation Write Isolation: Passes exact tenant context to withTenant', async () => {
    const req = new NextRequest('http://localhost/api/reconciliation/run', {
      method: 'POST',
      headers: new Headers({ 'x-org-id': 'org-3', 'content-type': 'application/json' }),
      body: JSON.stringify({
        periodKey: '2023-12',
        sourceDomainId: 'dom-1',
        targetDomainId: 'dom-2'
      })
    });
    await runRecon(req);
    expect(dbClient.withTenant).toHaveBeenCalledWith('org-3', expect.any(Function));
  });

});
