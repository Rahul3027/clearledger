import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import * as ssr from '@supabase/ssr';

vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn()
  };
});

describe('Phase 5.5B Middleware Remediation Verification', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (orgId: string | null) => {
    (ssr.createServerClient as any).mockReturnValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: 'user-1',
              user_metadata: orgId ? { org_id: orgId } : {}
            }
          }
        })
      }
    });
  };

  const getForwardedHeaders = (res: Response, req: NextRequest) => {
    const finalRequestHeaders = new Headers(req.headers);
    res.headers.forEach((value, key) => {
      if (key.startsWith('x-middleware-request-')) {
        const actualKey = key.replace('x-middleware-request-', '');
        finalRequestHeaders.set(actualKey, value);
      }
    });
    return finalRequestHeaders;
  };

  it('1. JWT org-1 + request header org-2 → route handler receives org-1', async () => {
    setupMock('org-1');
    const req = new NextRequest('http://localhost/api/workflow/cases', {
      headers: new Headers({ 'x-org-id': 'org-2' })
    });
    const res = await middleware(req);
    const headers = getForwardedHeaders(res, req);
    expect(headers.get('x-org-id')).toBe('org-1');
  });

  it('2. JWT org-1 + request header missing → route handler receives org-1', async () => {
    setupMock('org-1');
    const req = new NextRequest('http://localhost/api/workflow/cases');
    const res = await middleware(req);
    const headers = getForwardedHeaders(res, req);
    expect(headers.get('x-org-id')).toBe('org-1');
  });

  it('3. Missing tenant claim → request rejected', async () => {
    setupMock(null); // No org_id in JWT
    const req = new NextRequest('http://localhost/api/workflow/cases');
    const res = await middleware(req);
    expect(res.status).toBe(401);
  });
});
