import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore, getValidToken, deriveStatus } from './auth';
import { fakeJwt } from '@/test-utils/fake-jwt';

const validToken = fakeJwt(4102444800); // ~2100, no expira en tests
const session = {
  accessToken: validToken,
  user: { id: 'u1', username: 'neo', isAdmin: false },
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, hydrated: false });
  });

  it('setSession guarda la sesión', () => {
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().session).toEqual(session);
  });

  it('clear borra la sesión', () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('setHydrated marca hydrated = true', () => {
    expect(useAuthStore.getState().hydrated).toBe(false);
    useAuthStore.getState().setHydrated();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('getValidToken devuelve el token si no expiró', () => {
    useAuthStore.getState().setSession(session);
    expect(getValidToken()).toBe(validToken);
  });

  it('getValidToken devuelve null si el token expiró', () => {
    useAuthStore.getState().setSession({ accessToken: fakeJwt(1000), user: session.user });
    expect(getValidToken()).toBeNull();
  });

  it('getValidToken devuelve null sin sesión', () => {
    expect(getValidToken()).toBeNull();
  });
});

describe('deriveStatus', () => {
  it('loading antes de hidratar', () => {
    expect(deriveStatus(session, 0, false)).toBe('loading');
  });
  it('unauthenticated si no hay sesión', () => {
    expect(deriveStatus(null, 0, true)).toBe('unauthenticated');
  });
  it('unauthenticated si el token expiró', () => {
    expect(deriveStatus({ accessToken: fakeJwt(1000), user: session.user }, 9999 * 1000, true)).toBe('unauthenticated');
  });
  it('authenticated si hay sesión y token vigente', () => {
    expect(deriveStatus(session, 1000 * 1000, true)).toBe('authenticated');
  });
});
