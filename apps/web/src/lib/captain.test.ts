import { describe, expect, it } from 'vitest';
import { eligibleCaptainMatches, isCaptainLocked } from './captain';

describe('isCaptainLocked', () => {
  it('true si algún pick guardado es capitán', () => {
    expect(
      isCaptainLocked([{ isCaptain: false }, { isCaptain: true }]),
    ).toBe(true);
  });

  it('false si ningún pick es capitán', () => {
    expect(isCaptainLocked([{ isCaptain: false }, {}])).toBe(false);
  });

  it('false con lista vacía', () => {
    expect(isCaptainLocked([])).toBe(false);
  });
});

describe('eligibleCaptainMatches', () => {
  const matches = [
    { id: 'a' },
    { id: 'b' },
    { id: 'c' },
  ];

  it('excluye los partidos cerrados', () => {
    const closed = (id: string) => id === 'b';
    expect(eligibleCaptainMatches(matches, closed).map((m) => m.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('conserva todos si ninguno está cerrado', () => {
    expect(
      eligibleCaptainMatches(matches, () => false).map((m) => m.id),
    ).toEqual(['a', 'b', 'c']);
  });

  it('devuelve vacío si todos están cerrados', () => {
    expect(eligibleCaptainMatches(matches, () => true)).toEqual([]);
  });
});
