/**
 * Route guards (BR-AUTH-04, BR-ROLE-01..03). UX only: the server enforces every permission (BR-ROLE-05).
 * - no session → screen 01 (`/login`)
 * - wrong role → that role's home (CASHIER → 02, ADMIN → 20)
 */
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { Role } from '@/api/client';
import { BrandMark } from '@/components/BrandMark';

import { homeFor } from './session';
import { useAuth } from './useAuth';

/** Full-page placeholder while the refresh cookie is exchanged on load. */
export function SessionSplash() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-page" aria-busy="true" data-testid="session-splash">
      <div className="flex flex-col items-center gap-4 text-ink">
        <BrandMark />
        <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
        <span className="sr-only">جارٍ التحميل</span>
      </div>
    </div>
  );
}

/** Layout route: renders children only for an authenticated user. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SessionSplash />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Element wrapper: renders `children` only for the given roles, else redirects to the user's home. */
export function RoleGate({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/** Element wrapper: renders `children` only when unauthenticated, else redirects to home. */
export function AnonymousOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'authenticated' && user) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return <>{children}</>;
}
