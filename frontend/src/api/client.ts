/**
 * Typed API client generated from docs/api/openapi.yaml (ADR-0012). Unwraps the success envelope and turns error
 * envelopes into ApiError with a BR §9 code (ADR-0010). Screens use `call(() => api.GET(...))`.
 */
import createClient, { type Middleware } from 'openapi-fetch';

import type { ClientErrorCode } from '@/lib/errors';

import type { components, paths } from './schema';
import { getAccessToken, setAccessToken } from './token';

export type AuthSession = components['schemas']['AuthSession'];
export type CurrentUser = components['schemas']['CurrentUser'];
export type Role = components['schemas']['Role'];
export type UserItem = components['schemas']['User'];
export type CashierItem = components['schemas']['CashierListItem'];
export type StoreSettings = components['schemas']['Settings'];
export type UserStatus = components['schemas']['UserStatus'];

export const CSRF_HEADER = { 'X-Requested-With': 'simple-pos' } as const; // ADR-0003

export class ApiError extends Error {
  constructor(
    public readonly code: ClientErrorCode,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  // Resolve fetch per request (not at import time) so tests can stub it.
  fetch: (request) => globalThis.fetch(request),
});

const bearer: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
};
api.use(bearer);

interface Envelope<T> {
  success: true;
  message: string;
  data: T;
}
interface Result<T> {
  data?: Envelope<T>;
  error?: unknown;
  response: Response;
}

function toApiError(error: unknown, status: number): ApiError {
  if (error && typeof error === 'object' && 'code' in error) {
    const body = error as { code: ClientErrorCode; details?: Record<string, unknown> };
    return new ApiError(body.code, status, body.details ?? {});
  }
  return new ApiError('INTERNAL_ERROR', status);
}

/**
 * Called when the session is gone for good (a request got UNAUTHENTICATED and refresh failed). The auth layer uses it
 * to return to screen 01 with the BR §9 message (US-23.7, BR-AUTH-02 revocation).
 */
let sessionExpiredHandler: (() => void) | null = null;
export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

let refreshing: Promise<AuthSession | null> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a new access token (ADR-0011). Sends the CSRF header and the cookie
 * (ADR-0003). Concurrent callers share one request. Resolves to the session, or null when there is none.
 */
export function refreshSession(): Promise<AuthSession | null> {
  refreshing ??= api
    .POST('/api/auth/refresh', { params: { header: CSRF_HEADER }, credentials: 'include' })
    .then(({ data }) => {
      const session = data?.data ?? null;
      setAccessToken(session?.access_token ?? null);
      return session;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Run a request, unwrap `data`, retry once after refreshing on UNAUTHENTICATED, throw ApiError otherwise. */
export async function call<T>(request: () => Promise<Result<T>>, retry = true): Promise<T> {
  let result: Result<T>;
  try {
    result = await request();
  } catch {
    throw new ApiError('NETWORK_ERROR', 0);
  }
  if (result.response.status === 204) return undefined as T;
  if (result.data) return result.data.data;
  const error = toApiError(result.error, result.response.status);
  if (error.code === 'UNAUTHENTICATED') {
    if (retry && (await refreshSession())) return call(request, false);
    setAccessToken(null);
    sessionExpiredHandler?.();
  }
  throw error;
}
