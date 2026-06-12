import { describe, expect, it } from 'vitest';
import { buildInviteUrl } from './invite-url';

describe('buildInviteUrl', () => {
  it('usa el dominio canónico cuando está configurado', () => {
    expect(
      buildInviteUrl('ABC123', {
        appUrl: 'https://prode.miapp.com',
        origin: 'https://preview-xyz.vercel.app',
      }),
    ).toBe('https://prode.miapp.com/invitacion/ABC123');
  });

  it('cae al origin del navegador si no hay dominio canónico', () => {
    expect(
      buildInviteUrl('ABC123', {
        appUrl: undefined,
        origin: 'http://localhost:3000',
      }),
    ).toBe('http://localhost:3000/invitacion/ABC123');
  });

  it('ignora un dominio canónico vacío y usa el origin', () => {
    expect(
      buildInviteUrl('ABC123', {
        appUrl: '   ',
        origin: 'http://localhost:3000',
      }),
    ).toBe('http://localhost:3000/invitacion/ABC123');
  });

  it('recorta la barra final del dominio canónico', () => {
    expect(
      buildInviteUrl('ABC123', {
        appUrl: 'https://prode.miapp.com/',
        origin: '',
      }),
    ).toBe('https://prode.miapp.com/invitacion/ABC123');
  });

  it('devuelve string vacío como base si no hay ni dominio ni origin (SSR)', () => {
    expect(
      buildInviteUrl('ABC123', { appUrl: undefined, origin: '' }),
    ).toBe('/invitacion/ABC123');
  });
});
