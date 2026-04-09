import { NextResponse } from 'next/server';
import { getCookie } from 'cookies-next';

export function middleware(request: any) {
  const token = getCookie('auth_token', { req: request }); // Assuming we store a token here after Firebase login

  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = ['/profile', '/team', '/explore'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo).*)'],
};
