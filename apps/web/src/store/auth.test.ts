import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore, getValidToken } from './auth';

const session = {
  accessToken: 'tok-123',
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
    expect(getValidToken()).toBe('tok-123');
  });

  it('getValidToken devuelve null sin sesión', () => {
    expect(getValidToken()).toBeNull();
  });
});
