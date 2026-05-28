import { Result } from '@prisma/client';
import { computePredictionOutcome, resultFromScore } from './scoring';

describe('resultFromScore', () => {
  it('mapea local/empate/visitante', () => {
    expect(resultFromScore(2, 0)).toBe(Result.HOME);
    expect(resultFromScore(0, 2)).toBe(Result.AWAY);
    expect(resultFromScore(1, 1)).toBe(Result.DRAW);
  });
});

describe('computePredictionOutcome', () => {
  const base = { homeScoreGuess: null as number | null, awayScoreGuess: null as number | null, isCaptain: false };

  it('acierta solo el ganador: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 2, awayScore: 0 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });

  it('acierta resultado exacto: 5 pts y suma goles', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out).toEqual({ points: 5, correctWinner: 1, exactScore: 1, exactGoals: 3 });
  });

  it('capitán duplica los puntos del exacto: 10 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1, isCaptain: true },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out.points).toBe(10);
    expect(out.exactGoals).toBe(3); // los contadores NO se multiplican
  });

  it('falla el ganador: 0 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 0, awayScore: 1 },
    );
    expect(out).toEqual({ points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 });
  });

  it('empate correcto no exacto: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.DRAW, homeScoreGuess: 1, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 2 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });
});
