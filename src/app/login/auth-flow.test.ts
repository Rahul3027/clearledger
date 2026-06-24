import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { POST as logoutPost } from '@/app/auth/logout/route';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  })
}));

vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: vi.fn().mockImplementation((url, key, options) => {
      // Mock different session states based on request cookies
      return {
        auth: {
          getUser: vi.fn().mockImplementation(async () => {
            const hasAuthCookie = options.cookies.get('sb-mock-auth-token');
            if (hasAuthCookie === 'valid') {
              return { data: { user: { id: 'usr-1', email: 'test@example.com', user_metadata: { org_id: 'org-1' } } } };
            }
            if (hasAuthCookie === 'no-org') {
              return { data: { user: { id: 'usr-1', email: 'test@example.com' } } }; // missing org context
            }
            return { data: { user: null } };
          }),
          signOut: vi.fn().mockResolvedValue({ error: null })
        }
      };
    }),
    createBrowserClient: vi.fn().mockReturnValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: null })
      }
    })
  };
});

describe('Phase 7 M1: Authentication Flows', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Unauthenticated access to protected route redirects to /login', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await middleware(req);
    
    expect(res.status).toBe(307); // NextResponse.redirect uses 307
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard');
  });

  it('2. Authenticated access to protected route propagates successfully', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('sb-mock-auth-token', 'valid');
    
    const res = await middleware(req);
    
    // Middleware should not redirect. It sets headers and calls NextResponse.next()
    expect(res.status).toBe(200);
    // It should have injected the headers correctly (though hard to test Next.js internal header injection without e2e)
  });

  it('3. Authenticated access missing org context is rejected', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('sb-mock-auth-token', 'no-org');
    
    const res = await middleware(req);
    
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized: Missing tenant context');
  });

  it('4. Logout route signs out and redirects to /login', async () => {
    const req = new Request('http://localhost:3000/auth/logout', { method: 'POST' });
    
    // Simulate cookies injected by Next.js app router
    const res = await logoutPost(req);
    
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });
});
