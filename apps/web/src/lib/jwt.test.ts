import { describe, expect, it } from 'vitest';
import { isTokenExpired } from './jwt';
import { fakeJwt } from '@/test-utils/fake-jwt';

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
