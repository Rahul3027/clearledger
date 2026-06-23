import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Middleware — runs on every matched request.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie if it has expired
 *  2. Redirect unauthenticated users to /auth/login
 *  3. Validate org_id from JWT and pass it to the DB session variable
 *     via the x-org-id header (picked up by the DB client factory in route handlers)
 *
 * NOTE: The RLS session variable (SET LOCAL app.current_org_id) is set
 * in the DB client, not here — middleware cannot set DB session variables.
 * This middleware extracts and forwards the validated org_id only.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options } as never);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options } as never);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...options } as never);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options } as never);
        },
      },
    }
  );

  // Refresh session — required to keep the access token alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes without auth
  const isPublicRoute =
    pathname.startsWith("/auth/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon");

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // Forward validated org_id via header so route handlers can read it
    // without re-fetching the session. The DB client uses this to set
    // SET LOCAL app.current_org_id before each query.
    const orgId = user.user_metadata?.org_id as string | undefined;
    if (orgId) {
      response.headers.set("x-org-id", orgId);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     * Excludes: _next/static, _next/image, favicon.ico, public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
