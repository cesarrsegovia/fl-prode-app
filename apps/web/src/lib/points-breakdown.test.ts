import { describe, expect, it } from 'vitest';
import { Result } from '@prode/shared';
import { pointsBreakdown } from './points-breakdown';

const match = (homeScore: number, awayScore: number) => ({
  homeScore,
  awayScore,
  status: 'FINISHED' as const,
});

describe('pointsBreakdown', () => {
  it('solo ganador acertado suma 3', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 3, awayScoreGuess: 0, isCaptain: false },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 0, captainBonus: 0, total: 3 });
  });

  it('ganador + marcador exacto suma 5', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: false },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 0, total: 5 });
  });

  it('empate exacto suma 5', () => {
    const r = pointsBreakdown(
      { result: Result.DRAW, homeScoreGuess: 1, awayScoreGuess: 1, isCaptain: false },
      match(1, 1),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 0, total: 5 });
  });

  it('ganador fallado suma 0', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0, isCaptain: false },
      match(0, 1),
    );
    expect(r).toEqual({ winner: 0, exact: 0, captainBonus: 0, total: 0 });
  });

  it('capitán duplica: ganador+exacto = 10', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: true },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 5, total: 10 });
  });

  it('no exacto pero ganador acertado con capitán = 6', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 3, awayScoreGuess: 1, isCaptain: true },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 0, captainBonus: 3, total: 6 });
  });

  it('partido sin resultado devuelve null', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: false },
      { homeScore: null, awayScore: null, status: 'PENDING' as const },
    );
    expect(r).toBeNull();
  });
});
