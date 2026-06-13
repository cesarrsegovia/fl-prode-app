import { describe, expect, it } from 'vitest';
import { pointsFlagTone } from './points-flag';

describe('pointsFlagTone', () => {
  it('marcador exacto (exact > 0) => win', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 2, captainBonus: 0, total: 5 }),
    ).toBe('win');
  });

  it('solo resultado acertado (winner>0, exact=0) => partial', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 0, captainBonus: 0, total: 3 }),
    ).toBe('partial');
  });

  it('solo resultado con capitán (total 6, exact 0) => partial', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 0, captainBonus: 3, total: 6 }),
    ).toBe('partial');
  });

  it('exacto con capitán (total 10) => win', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 2, captainBonus: 5, total: 10 }),
    ).toBe('win');
  });

  it('nada acertado (total 0) => miss', () => {
    expect(
      pointsFlagTone({ winner: 0, exact: 0, captainBonus: 0, total: 0 }),
    ).toBe('miss');
  });
});
