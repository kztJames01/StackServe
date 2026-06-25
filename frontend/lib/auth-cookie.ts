import { setCookie, deleteCookie } from 'cookies-next';

export const AUTH_COOKIE = 'auth_token';
// cookie shell lasts a week; firebase token inside gets refreshed
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function storeAuthToken(token: string) {
  setCookie(AUTH_COOKIE, token, { maxAge: AUTH_COOKIE_MAX_AGE, path: '/' });
}

export function clearAuthToken() {
  deleteCookie(AUTH_COOKIE, { path: '/' });
}
