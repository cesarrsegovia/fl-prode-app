'use client';

import { useEffect } from 'react';
import { useAuthStore, deriveStatus } from '@/store/auth';
import { toSession, type ApiAuthResponse } from './session-core';

export { getValidToken as getToken } from '@/store/auth';
export { toSession } from './session-core';
export type { AuthSession } from './session-core';

export type { ApiAuthResponse };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export type SignInResult = { ok: true } | { error: string };

/**
 * Compatible en firma con next-auth `signIn`. Soporta:
 *  - 'credentials'      → POST /auth/login            (admins)
 *  - 'provider-launch'  → POST /auth/provider-exchange (usuarios del casino)
 */
export async function signIn(
  provider: 'credentials' | 'provider-launch',
  creds: { email?: string; password?: string; authorizationCode?: string; redirect?: boolean },
): Promise<SignInResult> {
  try {
    let res: Response;
    if (provider === 'credentials') {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
    } else {
      res = await fetch(`${API_URL}/auth/provider-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode: creds.authorizationCode }),
      });
    }
    if (!res.ok) return { error: 'CredentialsSignin' };
    const data = (await res.json()) as ApiAuthResponse;
    useAuthStore.getState().setSession(toSession(data));
    return { ok: true };
  } catch {
    return { error: 'Connection' };
  }
}

/** Compatible en firma con next-auth `signOut`. */
export function signOut(opts?: { callbackUrl?: string }): void {
  useAuthStore.getState().clear();
  if (typeof window !== 'undefined') {
    window.location.href = opts?.callbackUrl ?? '/';
  }
}

export interface SessionView {
  data: import('./session-core').AuthSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

/** Hook compatible con next-auth `useSession()` respaldado por el store. */
export function useSession(): SessionView {
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const status = deriveStatus(session, Date.now(), hydrated);
  return { data: status === 'authenticated' ? session : null, status };
}

/**
 * Reemplaza al SessionProvider de next-auth. Dispara la rehidratación del store
 * (que usa skipHydration: true) tras el primer render para evitar mismatch SSR.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);
  return <>{children}</>;
}
