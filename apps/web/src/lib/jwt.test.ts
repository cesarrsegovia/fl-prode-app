import { describe, expect, it } from 'vitest';
import { isTokenExpired, deriveStatus } from './jwt';

function fakeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(exp === undefined ? {} : { exp })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('isTokenExpired', () => {
  it('true si exp ya pasó', () => {
    expect(isTokenExpired(fakeJwt(1000), 2000 * 1000)).toBe(true);
  });
  it('false si exp es futuro', () => {
    expect(isTokenExpired(fakeJwt(5000), 1000 * 1000)).toBe(false);
  });
  it('false si no hay exp (token no expira)', () => {
    expect(isTokenExpired(fakeJwt(undefined), 1000 * 1000)).toBe(false);
  });
  it('true si el token está malformado', () => {
    expect(isTokenExpired('no-es-un-jwt', 0)).toBe(true);
  });
});

describe('deriveStatus', () => {
  const session = { accessToken: fakeJwt(5000), user: { id: 'u1', username: 'a', isAdmin: false } };
  it('loading antes de hidratar', () => {
    expect(deriveStatus(session, 0, false)).toBe('loading');
  });
  it('unauthenticated si no hay sesión', () => {
    expect(deriveStatus(null, 0, true)).toBe('unauthenticated');
  });
  it('unauthenticated si el token expiró', () => {
    expect(deriveStatus(session, 9999 * 1000, true)).toBe('unauthenticated');
  });
  it('authenticated si hay sesión y token vigente', () => {
    expect(deriveStatus(session, 1000 * 1000, true)).toBe('authenticated');
  });
});
