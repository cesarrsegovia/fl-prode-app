import { describe, expect, it } from 'vitest';
import { parseOrigins, isAllowedOrigin, buildMessage, EVENTS } from './bridge';

describe('parseOrigins', () => {
  it('separa por coma y limpia espacios/vacíos', () => {
    expect(parseOrigins(' https://a.com , https://b.com ,, ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
  it('string vacío → []', () => {
    expect(parseOrigins('')).toEqual([]);
  });
});

describe('isAllowedOrigin', () => {
  const allow = ['https://casino.com'];
  it('acepta origen en allowlist', () => {
    expect(isAllowedOrigin('https://casino.com', allow)).toBe(true);
  });
  it('rechaza origen fuera de allowlist', () => {
    expect(isAllowedOrigin('https://evil.com', allow)).toBe(false);
  });
  it('rechaza con allowlist vacía', () => {
    expect(isAllowedOrigin('https://casino.com', [])).toBe(false);
  });
});

describe('buildMessage', () => {
  it('sin payload', () => {
    expect(buildMessage(EVENTS.READY)).toEqual({ type: 'prode:ready' });
  });
  it('con payload', () => {
    expect(buildMessage(EVENTS.RESIZE, { height: 800 })).toEqual({
      type: 'prode:resize',
      payload: { height: 800 },
    });
  });
});

describe('EVENTS', () => {
  it('expone el contrato esperado', () => {
    expect(EVENTS).toMatchObject({
      READY: 'prode:ready',
      REQUEST_AUTH: 'prode:request-auth',
      RESIZE: 'prode:resize',
      REQUEST_DEPOSIT: 'prode:request-deposit',
      ERROR: 'prode:error',
      AUTH: 'casino:auth',
      BACK: 'casino:back',
    });
  });
});
