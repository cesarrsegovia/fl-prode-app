import { describe, expect, it } from 'vitest';
import { displayName, looksLikeGeneratedId } from './display-name';

describe('looksLikeGeneratedId', () => {
  it('detecta un cuid v1', () => {
    expect(looksLikeGeneratedId('cmq0row8z000004l2qvbynpny')).toBe(true);
  });

  it('detecta ids opacos largos sin espacios', () => {
    expect(looksLikeGeneratedId('cmq69gtkg000004lb7k5tmhad')).toBe(true);
  });

  it('no marca nombres legibles', () => {
    expect(looksLikeGeneratedId('Poenie88')).toBe(false);
    expect(looksLikeGeneratedId('manu8a')).toBe(false);
    expect(looksLikeGeneratedId('Silvermoonrg')).toBe(false);
  });

  it('no marca nombres con espacios ni cortos', () => {
    expect(looksLikeGeneratedId('Juan Perez')).toBe(false);
    expect(looksLikeGeneratedId('ab')).toBe(false);
  });
});

describe('displayName', () => {
  it('devuelve el nombre legible tal cual', () => {
    expect(displayName('Poenie88')).toBe('Poenie88');
  });

  it('reemplaza ids generados por Jugador #xxxx con los últimos 4 chars', () => {
    expect(displayName('cmq0row8z000004l2qvbynpny')).toBe('Jugador #NPNY');
  });

  it('usa el fallbackSeed cuando el username está vacío', () => {
    expect(displayName('', 'cmq69gtkg000004lb7k5tmhad')).toBe('Jugador #MHAD');
    expect(displayName(null, 'abcd1234')).toBe('Jugador #1234');
  });

  it('devuelve "Jugador" si no hay nada usable', () => {
    expect(displayName('')).toBe('Jugador');
    expect(displayName(null, null)).toBe('Jugador');
  });
});
