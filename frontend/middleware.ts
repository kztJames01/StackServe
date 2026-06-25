import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import aj from '@/lib/arcjet';

export async function middleware(request: NextRequest) {
  if (aj) {
    try {
      const decision = await aj.protect(request);
      if (decision.isDenied()) {
        const status = decision.reason.isRateLimit() ? 429 : 403;
        return NextResponse.json({ message: status === 429 ? 'Too many requests' : 'Forbidden' }, { status });
      }
    } catch {
      // fail open if arcjet hiccups
    }
  }

  const cookieToken = request.cookies.get('auth_token')?.value;
  const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
  const token = cookieToken || headerToken;

  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    '/explore',
    '/profile',
    '/team',
    '/messages',
    '/notifications',
    '/account',
    '/billing',
    '/settings',
    '/recruit',
    '/investors',
    '/history',
    '/projects',
  ];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|monitoring|_next/static|_next/image|favicon.ico|logo).*)'],
};
