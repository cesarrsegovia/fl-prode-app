import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore, getValidToken } from './auth';

// JWT de juguete con el exp dado (segundos epoch).
function fakeJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${header}.${payload}.sig`;
}

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
