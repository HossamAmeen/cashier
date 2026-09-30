/** Auth context object and its value type (split from the provider for react-refresh). */
import { createContext } from 'react';

import type { CurrentUser } from '@/api/client';
import type { ClientErrorCode } from '@/lib/errors';

import type { Credentials } from './session';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Why the user was sent back to screen 01 (e.g. UNAUTHENTICATED); shown once on the login form. */
  notice: ClientErrorCode | null;
  signIn: (credentials: Credentials) => Promise<CurrentUser>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);
