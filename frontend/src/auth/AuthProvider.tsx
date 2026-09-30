/**
 * Session state for the PWA (ADR-0011): bootstraps with the refresh cookie on load, signs in / out, and drops to
 * screen 01 with the BR §9 UNAUTHENTICATED message when the session expires or is revoked (US-23.7, BR-AUTH-02).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { onSessionExpired, type CurrentUser } from '@/api/client';
import type { ClientErrorCode } from '@/lib/errors';

import { AuthContext, type AuthStatus, type AuthValue } from './context';
import { login, logout, restoreSession, type Credentials } from './session';

interface State {
  status: AuthStatus;
  user: CurrentUser | null;
  notice: ClientErrorCode | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading', user: null, notice: null });

  // Bootstrap: the access token lives in memory only, so a reload always starts with a refresh (ADR-0011).
  useEffect(() => {
    let cancelled = false;
    void restoreSession().then((session) => {
      if (cancelled) return;
      setState(
        session
          ? { status: 'authenticated', user: session.user, notice: null }
          : { status: 'anonymous', user: null, notice: null },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A request got UNAUTHENTICATED and the refresh failed: the session is over (expired, revoked, user disabled).
  useEffect(() => {
    onSessionExpired(() => {
      queryClient.clear();
      setState((s) =>
        s.status === 'authenticated' ? { status: 'anonymous', user: null, notice: 'UNAUTHENTICATED' } : s,
      );
    });
    return () => onSessionExpired(null);
  }, [queryClient]);

  const signIn = useCallback(async (credentials: Credentials) => {
    const session = await login(credentials);
    setState({ status: 'authenticated', user: session.user, notice: null });
    return session.user;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    queryClient.clear();
    setState({ status: 'anonymous', user: null, notice: null });
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
