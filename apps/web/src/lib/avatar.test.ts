import { describe, expect, it } from 'vitest';
import { getInitials, diceBearAvatar } from './avatar';

describe('getInitials', () => {
  it('devuelve ?? cuando no hay nombre', () => {
    expect(getInitials()).toBe('??');
    expect(getInitials(null)).toBe('??');
    expect(getInitials('   ')).toBe('??');
  });

  it('toma las dos primeras letras de un nombre de una sola palabra', () => {
    expect(getInitials('Messi')).toBe('ME');
  });

  it('combina la inicial del primer y último nombre', () => {
    expect(getInitials('Lionel Andrés Messi')).toBe('LM');
  });

  it('colapsa espacios múltiples', () => {
    expect(getInitials('  Ana   Gómez ')).toBe('AG');
  });
});

describe('diceBearAvatar', () => {
  it('genera una URL de dicebear con el seed normalizado', () => {
    const url = diceBearAvatar('Cesar Segovia');
    expect(url).toContain('https://api.dicebear.com/9.x/personas/svg');
    expect(url).toContain('seed=cesar%20segovia');
  });

  it('usa un seed por defecto cuando el input está vacío', () => {
    expect(diceBearAvatar('')).toContain('seed=prode');
  });
});
