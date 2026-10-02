import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy
 * Refreshes Supabase session and enforces Role-Based Access Control (RBAC).
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session & get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const roleProtectedPaths = [
    { prefix: '/student', allowedRoles: ['student', 'admin'] },
    { prefix: '/faculty', allowedRoles: ['faculty', 'admin'] },
    { prefix: '/parent',  allowedRoles: ['parent', 'admin'] },
    { prefix: '/admin',   allowedRoles: ['admin'] },
  ];

  const matchedProtectedPath = roleProtectedPaths.find((item) =>
    pathname.startsWith(item.prefix)
  );

  if (matchedProtectedPath) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userMeta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const userRole = (userMeta.role || appMeta.role || 'student').toLowerCase();

    // Check if user has permission for this path
    if (!matchedProtectedPath.allowedRoles.includes(userRole)) {
      // Redirect to their own dashboard
      const userDashboard = new URL(`/${userRole}/dashboard`, request.url);
      return NextResponse.redirect(userDashboard);
    }
  }

  // If user is already authenticated and visits /login, redirect to their dashboard
  if (pathname === '/login' && user) {
    const userMeta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const userRole = (userMeta.role || appMeta.role || 'student').toLowerCase();
    return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo1.png|wel_img.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
