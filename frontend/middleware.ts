import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check cookie first, then Authorization header as fallback
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo).*)'],
};
