import type { AuthSession, AuthStatus } from '@/store/auth';

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return atob(base64);
  return Buffer.from(base64, 'base64').toString('binary');
}

/** true si el JWT está expirado o es inválido. Sin claim `exp` → no expira. */
export function isTokenExpired(token: string, nowMs: number): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}

/** Deriva el estado estilo NextAuth a partir del store. */
export function deriveStatus(
  session: AuthSession | null,
  nowMs: number,
  hydrated: boolean,
): AuthStatus {
  if (!hydrated) return 'loading';
  if (!session) return 'unauthenticated';
  if (isTokenExpired(session.accessToken, nowMs)) return 'unauthenticated';
  return 'authenticated';
}
