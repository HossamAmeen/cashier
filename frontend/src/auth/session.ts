/**
 * Auth API calls and role routing (BR-AUTH-01..04, ADR-0003, ADR-0011). Pure functions over the generated client so
 * the React layer stays thin and these are unit-testable.
 */
import { api, call, CSRF_HEADER, refreshSession, type AuthSession, type Role } from '@/api/client';
import { setAccessToken } from '@/api/token';

export interface Credentials {
  username: string;
  password: string;
  /** OQ-6: true → 7-day persistent refresh cookie, false → session cookie (ends when the browser closes). */
  rememberMe: boolean;
}

/**
 * POST /api/auth/login. `credentials: 'include'` so the browser stores the httpOnly refresh cookie set by the API
 * origin (ADR-0003). Username is sent as typed; the server matches it case-insensitively (BR §2 User).
 */
export async function login({ username, password, rememberMe }: Credentials): Promise<AuthSession> {
  const session = await call(
    () =>
      api.POST('/api/auth/login', {
        body: { username: username.trim(), password, remember_me: rememberMe },
        credentials: 'include',
      }),
    false,
  );
  setAccessToken(session.access_token);
  return session;
}

/** Session bootstrap on app load: the in-memory access token is gone after a reload, the refresh cookie is not. */
export function restoreSession(): Promise<AuthSession | null> {
  return refreshSession();
}

/**
 * POST /api/auth/logout with the CSRF header and the cookie (ADR-0003). Best effort: the local session always ends,
 * even if the request fails; an OPEN shift stays OPEN (OQ-29, US-27.3).
 */
export async function logout(): Promise<void> {
  try {
    await api.POST('/api/auth/logout', { params: { header: CSRF_HEADER }, credentials: 'include' });
  } catch {
    // Network failure: nothing else to do client-side.
  } finally {
    setAccessToken(null);
  }
}

/** BR-AUTH-04: CASHIER → screen 02 (`/`), ADMIN → screen 20 (`/admin`). */
export function homeFor(role: Role): string {
  return role === 'ADMIN' ? '/admin' : '/';
}

export const ROLE_LABELS: Record<Role, string> = { ADMIN: 'مدير', CASHIER: 'كاشير' };
